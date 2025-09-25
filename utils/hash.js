const bcrypt = require('bcrypt');

const hashPassword = async (plainText) => {
  const saltRounds = 10;
  return await bcrypt.hash(plainText, saltRounds);
};

const comparePassword = async (plainText, hashedPassword) => {
  return await bcrypt.compare(plainText, hashedPassword);
};

module.exports = { hashPassword, comparePassword };