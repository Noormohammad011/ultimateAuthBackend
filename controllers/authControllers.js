import expressAsyncHandler from 'express-async-handler'
import User from '../models/userModel.js'
import generateToken from '../utils/generateToken.js'
import jwt from 'jsonwebtoken'

//sendgrid
import sgMail from '@sendgrid/mail'

const signUp = expressAsyncHandler(async (req, res) => {
  const { name, email, password } = req.body

  // check if user exists with that email
  const userExists = await User.findOne({ email })

  if (userExists) {
    res.status(400)
    throw new Error('User already exists')
  }

  const token = generateToken(name, email, password)
  //verify email
  sgMail.setApiKey(process.env.SENDGRID_API_KEY)

  const emailData = {
    from: process.env.EMAIL_FROM,
    to: email,
    subject: `Account activation link`,
    html: `
                <h1>Please use the following link to activate your account</h1>
                <p>http://localhost:3000/auth/activate/${token}</p>
                <hr />
                <p>This email may contain sensetive information</p>
                <p>${process.env.CLIENT_URL}</p>
            `,
  }

  await sgMail
    .send(emailData)
    .then((sent) => {
      // console.log('SIGNUP EMAIL SENT', sent)
      return res.json({
        message: `Email has been sent to ${email}. Follow the instruction to activate your account`,
      })
    })
    .catch((err) => {
      console.log('SIGNUP EMAIL SENT ERROR', err)
      return res.json({
        message: err.message,
      })
    })
})

const accountActivation = expressAsyncHandler(async (req, res) => {
  const { token } = req.body
  if (token) {
    jwt.verify(token, process.env.JWT_ACCOUNT_ACTIVATION, function (err) {
      if (err) {
        console.log('JWT VERIFY IN ACCOUNT ACTIVATION ERROR', err)
        return res.status(401).json({
          error: 'Expired link. Signup again',
        })
      }
      const { name, email, password } = jwt.decode(token)
      const user = new User({ name, email, password })
      user.save((err, user) => {
        if (err) {
          return res.status(401).json({
            error: 'Error saving user in database. Try signup again',
          })
        }
        return res.json({
          message: 'Signup success. Please signin.',
        })
      })
    })
  } else {
    return res.json({
      message: 'Something went wrong. Try again.',
    })
  }
})

const signIn = expressAsyncHandler(async (req, res) => {
  const { email, password } = req.body
  User.findOne({ email }).exec((err, user) => {
    if (err || !user) {
      return res.status(400).json({
        error: 'User with that email does not exist. Please signup',
      })
    }
    // authenticate
    if (!user.authenticate(password)) {
      return res.status(400).json({
        error: 'Email and password do not match',
      })
    }
    // generate a token and send to client
    const token = jwt.sign({ _id: user._id }, process.env.JWT_SECRET, {
      expiresIn: '7d',
    })
    const { _id, name, email, role } = user

    return res.json({
      token,
      user: { _id, name, email, role },
    })
  })
})

const userProfile = expressAsyncHandler(async (req, res) => {
  const { id } = req.params
  User.findById(id).exec((err, user) => {
    if (err || !user) {
      return res.status(400).json({
        error: 'User not found',
      })
    }
    const { _id, name, email, role } = user
    return res.json({
      user: { _id, name, email, role },
    })
  })
})

const updateUserProfile = expressAsyncHandler(async (req, res) => {
  const { _id: UserId } = req.auth
  const { name, password } = req.body

  User.findById(UserId).exec((err, user) => {
    if (err || !user) {
      return res.status(400).json({
        error: 'User not found',
      })
    }

    if (!name) {
      return res.status(400).json({
        error: 'Name is required',
      })
    } else {
      user.name = name
    }
    if (password) {
      if (password.length < 6) {
        return res.status(400).json({
          error: 'Password should be min 6 characters long',
        })
      } else {
        user.password = password
      }
    }
    user.save((err, updatedUser) => {
      if (err) {
        console.log('USER UPDATE ERROR', err)
        return res.status(400).json({
          error: 'User update failed. Try again',
        })
      }
      updatedUser.hashed_password = undefined
      updatedUser.salt = undefined
      res.json({updatedUser})
    })
  })
})

export { signUp, accountActivation, signIn, userProfile, updateUserProfile }
