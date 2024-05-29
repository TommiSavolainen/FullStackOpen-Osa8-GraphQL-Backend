const { ApolloServer } = require('@apollo/server');
const { startStandaloneServer } = require('@apollo/server/standalone');
const { title } = require('process');
const { v1: uuid } = require('uuid');
const mongoose = require('mongoose');

mongoose.set('strictQuery', false);
const Book = require('./models/book');
const Author = require('./models/author');

require('dotenv').config();
const MONGODB_URI = process.env.MONGODB_URI;

console.log('connecting to', MONGODB_URI);

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
  type Mutation {
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
    bookCount: Int!
    authorCount: Int!
    allBooks(author: AuthorInput, genre: String): [Book!]!
    allAuthors: [Author!]!
    id: ID!
  }`;

// const resolvers = {
//     Mutation: {
//         addBook: (root, args) => {
//             const book = { ...args, id: uuid() };
//             books = books.concat(book);
//             if (!authors.find((a) => a.name === args.author)) {
//                 authors = authors.concat({ name: args.author, id: uuid() });
//             }
//             return book;
//         },
//         editAuthor: (root, args) => {
//             const author = authors.find((a) => a.name === args.name);
//             if (!author) {
//                 return null;
//             }

//             const updatedAuthor = { ...author, born: args.setBornTo };
//             authors = authors.map((a) => (a.name === args.name ? updatedAuthor : a));
//             return updatedAuthor;
//         },
//     },
//     Author: {
//         bookCount: (root) => {
//             return books.filter((b) => b.author === root.name).length;
//         },
//     },
//     Query: {
//         bookCount: () => books.length,
//         authorCount: () => authors.length,
//         allBooks: (root, args) => {
//             if (!args.author && !args.genre) {
//                 return books;
//             }

//             if (args.author && args.genre) {
//                 return books.filter((b) => b.author === args.author && b.genres.includes(args.genre));
//             }

//             if (args.author) {
//                 return books.filter((b) => b.author === args.author);
//             }

//             if (args.genre) {
//                 return books.filter((b) => b.genres.includes(args.genre));
//             }
//         },
//         allAuthors: () => authors,
//     },
// };

const resolvers = {
    Mutation: {
        addBook: async (root, args) => {
            const author = await Author.findOne({ name: args.author.name });
            if (!author) {
                const newAuthor = new Author({ name: args.author.name });
                await newAuthor.save();
            }
            const book = new Book({ ...args, author: author._id });
            return book.save();
        },
        editAuthor: async (root, args) => {
            const author = await Author.findOne({ name: args.name });
            if (!author) {
                return null;
            }
            author.born = args.setBornTo;
            return author.save();
        },
    },
    Query: {
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
}).then(({ url }) => {
    console.log(`Server ready at ${url}`);
});
