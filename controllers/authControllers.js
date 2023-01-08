import expressAsyncHandler from 'express-async-handler'
import User from '../models/userModel.js'
import generateToken from '../utils/generateToken.js'
import jwt from 'jsonwebtoken'
import _ from 'lodash'
import { OAuth2Client } from 'google-auth-library'
import fetch from 'node-fetch'
//sendgrid
import sgMail from '@sendgrid/mail'
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID)

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
                <p>${process.env.CLIENT_URL}/auth/activate/${token}</p>
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

const updateProfile = expressAsyncHandler(async (req, res) => {
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
      res.json({ updatedUser })
    })
  })
})

const forgotPassword = expressAsyncHandler(async (req, res) => {
  const { email } = req.body

  User.findOne({ email }, (err, user) => {
    if (err || !user) {
      return res.status(400).json({
        error: 'User with that email does not exist',
      })
    }
    //verify email
    sgMail.setApiKey(process.env.SENDGRID_API_KEY)

    const token = jwt.sign({ _id: user._id }, process.env.JWT_RESET_PASSWORD, {
      expiresIn: '10m',
    })

    const emailData = {
      from: process.env.EMAIL_FROM,
      to: email,
      subject: `Password Reset link`,
      html: `
                <h1>Please use the following link to reset your password</h1>
                <p>${process.env.CLIENT_URL}/auth/password/reset/${token}</p>
                <hr />
                <p>This email may contain sensetive information</p>
                <p>${process.env.CLIENT_URL}</p>
            `,
    }

    return user.updateOne({ resetPasswordLink: token }, (err, success) => {
      if (err) {
        console.log('RESET PASSWORD LINK ERROR', err)
        return res.status(400).json({
          error: 'Database connection error on user password forgot request',
        })
      } else {
       sgMail
          .send(emailData)
          .then((sent) => {
    
            return res.json({
              message: `Email has been sent to ${email}. Follow the instruction to activate your account`,
            })
          })
          .catch((err) => {
            // console.log('SIGNUP EMAIL SENT ERROR', err)
            return res.json({
              message: err.message,
            })
          })
      }
    })
  })
})

const resetPassword = expressAsyncHandler(async (req, res) => {
  const { resetPasswordLink, newPassword } = req.body
  if (resetPasswordLink) {
    jwt.verify(
      resetPasswordLink,
      process.env.JWT_RESET_PASSWORD,
      function (err, decoded) {
        if (err) {
          return res.status(400).json({
            error: 'Expired link. Try again',
          })
        }

        User.findOne({ resetPasswordLink }, (err, user) => {
          if (err || !user) {
            return res.status(400).json({
              error: 'Something went wrong. Try later',
            })
          }

          const updatedFields = {
            password: newPassword,
            resetPasswordLink: '',
          }

          user = _.extend(user, updatedFields)

          user.save((err, result) => {
            if (err) {
              return res.status(400).json({
                error: 'Error resetting user password',
              })
            }
            res.json({
              message: `Great! Now you can login with your new password`,
            })
          })
        })
      }
    )
  }
})
 
const googleLogin = expressAsyncHandler(async (req, res) => {
  const { idToken } = req.body
   client
     .verifyIdToken({ idToken, audience: process.env.GOOGLE_CLIENT_ID })
     .then((response) => {
       // console.log('GOOGLE LOGIN RESPONSE',response)
       const { email_verified, name, email } = response.payload
       if (email_verified) {
         User.findOne({ email }).exec((err, user) => {
           if (user) {
             const token = jwt.sign({ _id: user._id }, process.env.JWT_SECRET, {
               expiresIn: '7d',
             })
             const { _id, email, name, role } = user
             return res.json({
               token,
               user: { _id, email, name, role },
             })
           } else {
             let password = email + process.env.JWT_SECRET
             user = new User({ name, email, password })
             user.save((err, data) => {
               if (err) {
                 console.log('ERROR GOOGLE LOGIN ON USER SAVE', err)
                 return res.status(400).json({
                   error: 'User signup failed with google',
                 })
               }
               const token = jwt.sign(
                 { _id: data._id },
                 process.env.JWT_SECRET,
                 { expiresIn: '7d' }
               )
               const { _id, email, name, role } = data
               return res.json({
                 token,
                 user: { _id, email, name, role },
               })
             })
           }
         })
       } else {
         return res.status(400).json({
           error: 'Google login failed. Try again',
         })
       }
     })
 })
//https://graph.facebook.com/v2.11/${userID}/?fields=id,name,email&access_token=${accessToken}
//https://www.facebook.com/dialog/oauth?client_id=${userID}/&fields=id,name,email&access_token=${accessToken}&redirect_uri=https://amazing-sorbet-063a48.netlify.app/accounts/facebook/login/callback/
const facebookLogin = expressAsyncHandler(async (req, res) => {
   const { userID, accessToken } = req.body
   const url = `https://www.facebook.com/dialog/oauth?client_id=${userID}/&fields=id,name,email&access_token=${accessToken}&redirect_uri=https://amazing-sorbet-063a48.netlify.app/accounts/facebook/login/callback`
   return (
     fetch(url, {
       method: 'GET',
     })
       .then((response) => response.json())
       .then((response) => {
         const { email, name } = response
         User.findOne({ email }).exec((err, user) => {
           if (user) {
             const token = jwt.sign({ _id: user._id }, process.env.JWT_SECRET, {
               expiresIn: '7d',
             })
             const { _id, email, name, role } = user
             return res.json({
               token,
               user: { _id, email, name, role },
             })
           } else {
             let password = email + process.env.JWT_SECRET
             user = new User({ name, email, password })
             user.save((err, data) => {
               if (err) {
                 return res.status(400).json({
                   error: 'User signup failed with facebook',
                 })
               }
               const token = jwt.sign(
                 { _id: data._id },
                 process.env.JWT_SECRET,
                 { expiresIn: '7d' }
               )
               const { _id, email, name, role } = data
               return res.json({
                 token,
                 user: { _id, email, name, role },
               })
             })
           }
         })
       })
       .catch((error) => {
         res.json({
           error: 'Facebook login failed. Try later',
         })
       })
   )

 })
export {
  signUp,
  accountActivation,
  signIn,
  userProfile,
  updateProfile,
  forgotPassword,
  resetPassword,
  googleLogin,
  facebookLogin,
}
