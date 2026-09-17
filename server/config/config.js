require("dotenv").config();

const base = {
  username: process.env.DB_USERNAME || "postgres",
  password: process.env.DB_PASSWORD || "postgres",
  database: process.env.DB_NAME || "afksnap_development",
  host: process.env.DB_HOST || "127.0.0.1",
  port: Number(process.env.DB_PORT || 5432),
  dialect: process.env.DB_DIALECT || "postgres",
  logging: false,
};

module.exports = {
  development: base,
  test: {
    ...base,
    database: process.env.DB_TEST_NAME || "afksnap_test",
  },
  production: process.env.DATABASE_URL
    ? {
        use_env_variable: "DATABASE_URL",
        dialect: "postgres",
        logging: false,
        dialectOptions: { ssl: { require: true, rejectUnauthorized: false } },
      }
    : base,
};
