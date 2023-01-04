import express from 'express'
import chalk from 'chalk'
import cors from 'cors'
import * as dotenv from 'dotenv' 
import connectDB from './config/db.js'
import 'express-async-errors'
import { notFound, errorHandler } from './middleware/errorMiddleware.js'

//import routes
import authRoutes from './routes/authRoutes.js'


//import middlewares
import morgan from 'morgan'

//express configuration

dotenv.config()
const app = express()

//conncet to database
connectDB()
//morgan
app.use(morgan('dev'))

// For parsing application/json
app.use(express.json())

// For parsing application/x-www-form-urlencoded
app.use(express.urlencoded({ extended: true }))
// Enable cors
app.use(cors())

//mount routers
app.use('/api', authRoutes)


//middleware for error handling
app.use(notFound)
app.use(errorHandler)

const PORT = process.env.PORT || 5000

app.listen(
  PORT,
  console.log(
   chalk.blue.underline.bold(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`)
  )
)
