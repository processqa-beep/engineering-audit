import nodemailer from 'nodemailer';

async function testMail(host, port, user, pass) {
  console.log(`Testing SMTP host: ${host}, port: ${port}`);
  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
    tls: { rejectUnauthorized: false }
  });

  try {
    await transporter.verify();
    console.log(`✅ SUCCESS: Transporter verified for ${host}!`);

    const info = await transporter.sendMail({
      from: `Process QA <${user}>`,
      to: 'mehul.chikhaliya@borosil.com',
      subject: '✅ Live Test Email - Borosil Process QA',
      html: '<h2>Borosil Engineering Audit Portal</h2><p>Live email delivery is configured and working perfectly!</p>'
    });
    console.log(`✅ SUCCESS: Email dispatched! Message ID: ${info.messageId}`);
    return true;
  } catch (err) {
    console.error(`❌ FAILED on ${host}:`, err.message);
    return false;
  }
}

async function run() {
  const user = 'process.qa@borosil.com';
  const pass = 'mkse ghmg fuua uncx';

  // 1. Try Microsoft 365
  const o365Success = await testMail('smtp.office365.com', 587, user, pass);
  if (o365Success) {
    console.log('🎉 Microsoft 365 SMTP is ACTIVE and WORKING!');
    return;
  }

  // 2. Try Google Workspace SMTP
  console.log('\nTesting Google Workspace SMTP (smtp.gmail.com)...');
  const gmailSuccess = await testMail('smtp.gmail.com', 587, user, pass);
  if (gmailSuccess) {
    console.log('🎉 Google Workspace SMTP is ACTIVE and WORKING!');
    return;
  }
}

run();
