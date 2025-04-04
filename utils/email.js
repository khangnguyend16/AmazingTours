const nodemailer = require('nodemailer');

module.exports = class Email {
    constructor(user) {
        this.to = user.email;
        this.from = `Khang <${process.env.EMAIL_FROM}>`;
    }

    newTransport() {
        if (process.env.NODE_ENV === 'production') {
            // Sendgrid
            return nodemailer.createTransport({
                host: 'in-v3.mailjet.com',
                port: 587,
                secure: false, // true cho port 465, false cho 587 (dùng TLS)
                auth: {
                    user: process.env.MJ_APIKEY_PUBLIC,     // using Mailjet
                    pass: process.env.MJ_APIKEY_PRIVATE
                }
            });
        }
        return nodemailer.createTransport({
            host: process.env.EMAIL_HOST,
            port: process.env.EMAIL_PORT,
            auth: {
                user: process.env.EMAIL_USERNAME,
                pass: process.env.EMAIL_PASSWORD
            }
        })
    }

    // Send the actual email
    async send(options) {
        // // 1. Render HTML based on a pug template
        // const html = pug.renderFile(`${__dirname}/../views/${template}.pug`, {
        //     firstName: this.firstName,
        //     url: this.url,
        //     subject
        // })

        // 2. Define email options
        const mailOptions = {
            from: this.from,
            to: this.to,
            subject: options.subject,
            text: options.message
        }

        // 3. Create a transport and send email
        await this.newTransport().sendMail(mailOptions)
    }
}

