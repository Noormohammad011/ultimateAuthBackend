import jwt from 'jsonwebtoken'

const generateToken = (name, email, password) => {
  return jwt.sign({ name, email, password }, process.env.JWT_ACCOUNT_ACTIVATION, {
    expiresIn: '10m',
  })
}



export default generateToken
