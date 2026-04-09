const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

const sendEmail = async (to, subject, html) => {
  await transporter.sendMail({
    from: `"Underwav" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    html
  });
};

module.exports = sendEmail;


// This is a small utility file, not a controller — it just sets up and exports a reusable 
// sendEmail function used by auth (signup verification, password reset, email change).



// nodemailer is the Node.js library for sending emails. createTransport sets up the connection to the email 
// provider — in this case Gmail.
// process.env.EMAIL_USER and process.env.EMAIL_PASS read from your .env file — credentials are never hardcoded 
// directly in source code for security reasons. The password here would be a Gmail App Password, not your actual 
// Gmail password.
// The transporter is created once at the top of the file and reused for every email sent — no need to recreate 
// it on every call.


// sendEmail function
// Takes three parameters — to (recipient), subject (email subject line), and html (the email body as HTML). 
// The from field sets the display name as "Underwav" with the actual Gmail address behind it — that's what the 
// recipient sees as the sender name in their inbox.
// The function is async and uses await because sending an email is a network operation that takes time.


// Short and simple — it's just a wrapper that keeps email sending logic in one place so 
// every controller that needs to send an email just calls this instead of setting up nodemailer themselves. 