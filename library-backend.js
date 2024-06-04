const { ApolloServer } = require('@apollo/server');
const { startStandaloneServer } = require('@apollo/server/standalone');
const { title } = require('process');
const { v1: uuid } = require('uuid');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

mongoose.set('strictQuery', false);
const User = require('./models/user');
const Book = require('./models/book');
const Author = require('./models/author');
const { GraphQLError } = require('graphql');

require('dotenv').config();
const MONGODB_URI = process.env.MONGODB_URI;
const JWT_SECRET = process.env.JWT_SECRET;

console.log('connecting to MongoDB');

mongoose
    .connect(MONGODB_URI)
    .then(() => {
        console.log('connected to MongoDB');
    })
    .catch((error) => {
        console.log('error connecting to MongoDB:', error.message);
    });

let authors = [
    {
        name: 'Robert Martin',
        id: 'afa51ab0-344d-11e9-a414-719c6709cf3e',
        born: 1952,
    },
    {
        name: 'Martin Fowler',
        id: 'afa5b6f0-344d-11e9-a414-719c6709cf3e',
        born: 1963,
    },
    {
        name: 'Fyodor Dostoevsky',
        id: 'afa5b6f1-344d-11e9-a414-719c6709cf3e',
        born: 1821,
    },
    {
        name: 'Joshua Kerievsky', // birthyear not known
        id: 'afa5b6f2-344d-11e9-a414-719c6709cf3e',
    },
    {
        name: 'Sandi Metz', // birthyear not known
        id: 'afa5b6f3-344d-11e9-a414-719c6709cf3e',
    },
];

/*
 * Suomi:
 * Saattaisi olla järkevämpää assosioida kirja ja sen tekijä tallettamalla kirjan yhteyteen tekijän nimen sijaan tekijän id
 * Yksinkertaisuuden vuoksi tallennamme kuitenkin kirjan yhteyteen tekijän nimen
 *
 * English:
 * It might make more sense to associate a book with its author by storing the author's id in the context of the book instead of the author's name
 * However, for simplicity, we will store the author's name in connection with the book
 *
 * Spanish:
 * Podría tener más sentido asociar un libro con su autor almacenando la id del autor en el contexto del libro en lugar del nombre del autor
 * Sin embargo, por simplicidad, almacenaremos el nombre del autor en conexión con el libro
 */

let books = [
    {
        title: 'Clean Code',
        published: 2008,
        author: 'Robert Martin',
        id: 'afa5b6f4-344d-11e9-a414-719c6709cf3e',
        genres: ['refactoring'],
    },
    {
        title: 'Agile software development',
        published: 2002,
        author: 'Robert Martin',
        id: 'afa5b6f5-344d-11e9-a414-719c6709cf3e',
        genres: ['agile', 'patterns', 'design'],
    },
    {
        title: 'Refactoring, edition 2',
        published: 2018,
        author: 'Martin Fowler',
        id: 'afa5de00-344d-11e9-a414-719c6709cf3e',
        genres: ['refactoring'],
    },
    {
        title: 'Refactoring to patterns',
        published: 2008,
        author: 'Joshua Kerievsky',
        id: 'afa5de01-344d-11e9-a414-719c6709cf3e',
        genres: ['refactoring', 'patterns'],
    },
    {
        title: 'Practical Object-Oriented Design, An Agile Primer Using Ruby',
        published: 2012,
        author: 'Sandi Metz',
        id: 'afa5de02-344d-11e9-a414-719c6709cf3e',
        genres: ['refactoring', 'design'],
    },
    {
        title: 'Crime and punishment',
        published: 1866,
        author: 'Fyodor Dostoevsky',
        id: 'afa5de03-344d-11e9-a414-719c6709cf3e',
        genres: ['classic', 'crime'],
    },
    {
        title: 'Demons',
        published: 1872,
        author: 'Fyodor Dostoevsky',
        id: 'afa5de04-344d-11e9-a414-719c6709cf3e',
        genres: ['classic', 'revolution'],
    },
];

/*
  you can remove the placeholder query once your first one has been implemented 
*/

const typeDefs = `
  input AuthorInput {
    name: String!
  }
  type User {
    username: String!
    favoriteGenre: String!
    id: ID!
  }
  type Token {
    value: String!
  }
  type Mutation {
    addAuthor(name: String!): Author!
    createUser(
        username: String!
        favoriteGenre: String!
    ): User
    login(
        username: String!
        password: String!
    ): Token
    addBook(
      title: String!
      author: AuthorInput!
      published: Int!
      genres: [String!]!
    ): Book
    editAuthor(
      name: String!
      setBornTo: Int!
    ): Author
  }
  type Book {
    title: String!
    published: Int!
    author: Author!
    id: ID!
    genres: [String!]!
  }
  type Author {
    name: String!
    id: ID!
    born: Int
    bookCount: Int
  }
  type Query {
    me: User
    bookCount: Int!
    authorCount: Int!
    allBooks(author: AuthorInput, genre: String): [Book!]!
    allAuthors: [Author!]!
    id: ID!
  }`;

const resolvers = {
    Mutation: {
        addAuthor: async (root, args) => {
            const author = new Author({ name: args.name });
            await author.save();
            return author;
        },
        createUser: async (root, args) => {
            const user = new User({ username: args.username, favoriteGenre: args.favoriteGenre });
            return user.save();
        },
        login: async (root, args) => {
            const user = await User.findOne({ username: args.username });
            if (!user || args.password !== JWT_SECRET) {
                throw new GraphQLError('Invalid credentials', {
                    extensions: {
                        code: 'UNAUTHENTICATED',
                    },
                });
            }
            const userForToken = {
                username: user.username,
                id: user._id,
                favoriteGenre: user.favoriteGenre,
            };
            return { value: jwt.sign(userForToken, JWT_SECRET) };
        },
        addBook: async (root, args, context) => {
            console.log('args', args);
            const currentUser = context.currentUser;
            if (!currentUser) {
                throw new GraphQLError('Not authenticated', {
                    extensions: {
                        code: 'UNAUTHENTICATED',
                    },
                });
            }
            let author = await Author.findOne({ name: args.author.name });
            console.log('author', author);
            if (!author) {
                if (args.author.name.length < 4) {
                    throw new GraphQLError('Author name must be at least 4 characters long', {
                        extensions: {
                            code: 'BAD_USER_INPUT',
                        },
                    });
                }
                author = new Author({ name: args.author.name });
                await author.save();
            }
            if (args.title.length < 5) {
                throw new GraphQLError('Title must be at least 5 characters long', {
                    extensions: {
                        code: 'BAD_USER_INPUT',
                    },
                });
            }
            const book = new Book({ ...args, author: author._id });
            console.log('book', book);
            await book.save();
            return book;
        },
        editAuthor: async (root, args, context) => {
            const currentUser = context.currentUser;
            if (!currentUser) {
                throw new GraphQLError('Not authenticated', {
                    extensions: {
                        code: 'UNAUTHENTICATED',
                    },
                });
            }
            const author = await Author.findOne({ name: args.name });
            if (!author) {
                return null;
            }
            author.born = args.setBornTo;
            return author.save();
        },
    },
    Query: {
        // logged user
        me: (root, args, context) => {
            console.log('context', context);
            return context.currentUser
                ? {
                      username: context.currentUser.username,
                      favoriteGenre: context.currentUser.favoriteGenre,
                      id: context.currentUser._id,
                  }
                : null;
        },
        bookCount: () => Book.collection.countDocuments(),
        authorCount: () => Author.collection.countDocuments(),
        allBooks: async (root, args) => {
            if (args.author) {
                const author = await Author.findOne({ name: args.author.name });
                const books = await Book.find({ author: author._id }).populate('author');
                return books;
            }
            const books = await Book.find({}).populate('author');
            return books;
        },
        allAuthors: async () => await Author.find({}),
    },
    Author: {
        bookCount: async (root) => {
            const count = await Book.countDocuments({ author: root._id });
            return count;
        },
    },
};

const server = new ApolloServer({
    typeDefs,
    resolvers,
});

startStandaloneServer(server, {
    listen: { port: 4000 },
    context: async ({ req }) => {
        const auth = req ? req.headers.authorization : null;
        if (auth && auth.startsWith('bearer ')) {
            const decodedToken = jwt.verify(auth.substring(7), JWT_SECRET);
            const currentUser = await User.findById(decodedToken.id);
            return { currentUser, favoriteGenre: decodedToken.favoriteGenre };
        }
        return { currentUser: null };
    },
}).then(({ url }) => {
    console.log(`Server ready at ${url}`);
});
