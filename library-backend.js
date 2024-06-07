const { ApolloServer } = require('@apollo/server');
const { expressMiddleware } = require('@apollo/server/express4');
const { ApolloServerPluginDrainHttpServer } = require('@apollo/server/plugin/drainHttpServer');
const { makeExecutableSchema } = require('@graphql-tools/schema');
const express = require('express');
const cors = require('cors');
const http = require('http');
const { WebSocketServer } = require('ws');
const { useServer } = require('graphql-ws/lib/use/ws');

// const { startStandaloneServer } = require('@apollo/server/standalone');
// const { title } = require('process');
// const { v1: uuid } = require('uuid');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const typeDefs = require('./schema');
const resolvers = require('./resolvers');
mongoose.set('strictQuery', false);
const User = require('./models/user');
// const Book = require('./models/book');
// const Author = require('./models/author');
// const { GraphQLError } = require('graphql');

// Seuraa kyselyitä ja niiden tuloksia:
// mongoose.set('debug', (collectionName, method, query, doc) => {
//     console.log(`${collectionName}.${method}`, JSON.stringify(query), doc);
// });

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

const start = async () => {
    const app = express();
    const httpServer = http.createServer(app);
    const wsServer = new WebSocketServer({ server: httpServer, path: '/' });
    const schema = makeExecutableSchema({ typeDefs, resolvers });
    const serverCleanup = useServer({ schema }, wsServer);
    const server = new ApolloServer({
        schema: makeExecutableSchema({
            typeDefs,
            resolvers,
        }),
        plugins: [
            ApolloServerPluginDrainHttpServer({ httpServer }),
            {
                async serverWillStart() {
                    return {
                        async drainServer() {
                            await serverCleanup.dispose();
                        },
                    };
                },
            },
        ],
    });
    await server.start();
    app.use(
        '/',
        cors(),
        express.json(),
        expressMiddleware(server, {
            context: async ({ req }) => {
                const auth = req ? req.headers.authorization : null;
                if (auth && auth.startsWith('bearer ')) {
                    const decodedToken = jwt.verify(auth.substring(7), JWT_SECRET);
                    const currentUser = await User.findById(decodedToken.id);
                    return { currentUser, favoriteGenre: decodedToken.favoriteGenre };
                }
                return { currentUser: null };
            },
        })
    );
    const PORT = 4000;
    httpServer.listen(PORT, () => console.log(`Server ready at http://localhost:${PORT}`));
};
start();
// const server = new ApolloServer({
//     typeDefs,
//     resolvers,
// });

// startStandaloneServer(server, {
//     listen: { port: 4000 },
//     context: async ({ req }) => {
//         const auth = req ? req.headers.authorization : null;
//         if (auth && auth.startsWith('bearer ')) {
//             const decodedToken = jwt.verify(auth.substring(7), JWT_SECRET);
//             const currentUser = await User.findById(decodedToken.id);
//             return { currentUser, favoriteGenre: decodedToken.favoriteGenre };
//         }
//         return { currentUser: null };
//     },
// }).then(({ url }) => {
//     console.log(`Server ready at ${url}`);
// });
