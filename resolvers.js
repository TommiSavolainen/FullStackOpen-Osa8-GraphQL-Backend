const { GraphQLError } = require('graphql');
const { PubSub } = require('graphql-subscriptions');
const pubsub = new PubSub();
const jwt = require('jsonwebtoken');
const Author = require('./models/author');
const Book = require('./models/book');
const User = require('./models/user');
require('dotenv').config();
const JWT_SECRET = process.env.JWT_SECRET;

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
            pubsub.publish('BOOK_ADDED', { bookAdded: book });
            author.books = author.books.concat(book._id);
            await author.save();
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
            console.log('args.setBornTo', args.setBornTo);
            console.log('author', author);
            author.born = args.setBornTo;
            return author.save();
        },
    },
    Subscription: {
        bookAdded: {
            subscribe: () => pubsub.asyncIterator(['BOOK_ADDED']),
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
        allAuthors: async () => await Author.find({}).populate('books'),
    },
    Author: {
        bookCount: async (root) => {
            const count = await root.books.length;
            return count;
        },
    },
};
module.exports = resolvers;
