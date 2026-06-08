require('dotenv').config()

const baseConfig = {
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_DATABASE || 'ChatRealTime',
  host: process.env.DB_HOST || 'localhost',
  dialect: process.env.DB_DIALECT || 'postgres',
  logging: false,
}

module.exports = {
  development: process.env.DATABASE_URL
    ? { use_env_variable: 'DATABASE_URL', dialect: 'postgres', logging: false }
    : baseConfig,
  test: {
    username: process.env.DB_TEST_USERNAME || baseConfig.username,
    password: process.env.DB_TEST_PASSWORD || baseConfig.password,
    database: process.env.DB_TEST_DATABASE || 'ChatRealTime_test',
    host: process.env.DB_TEST_HOST || baseConfig.host,
    dialect: process.env.DB_TEST_DIALECT || baseConfig.dialect,
    logging: false,
  },
  production: process.env.DATABASE_URL
    ? { use_env_variable: 'DATABASE_URL', dialect: 'postgres', logging: false }
    : {
        username: process.env.DB_USERNAME,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_DATABASE,
        host: process.env.DB_HOST,
        dialect: process.env.DB_DIALECT || 'postgres',
        logging: false,
      },
}
