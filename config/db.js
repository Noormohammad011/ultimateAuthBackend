import mongoose from 'mongoose'
import chalk from 'chalk'
mongoose.set('strictQuery', false)

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      useUnifiedTopology: true,
      useNewUrlParser: true,
    })

    console.log(
      chalk.green.underline.bold(`MongoDB Connected:  ${conn.connection.host}`)
    )
  } catch (error) {
    console.error(chalk.red.underline.bold(`Error: ${error.message}`))
    process.exit(1)
  }
}

export default connectDB
