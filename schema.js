const typeDefs = `
  input AuthorInput {
    name: String!
  }
  type Subscription {
    bookAdded: Book!
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

module.exports = typeDefs;
