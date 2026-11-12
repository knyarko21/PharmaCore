
const { Resend } = require("resend");
const nodemailer = require("nodemailer");

// =====================================================
// CONFIGURATION
// =====================================================

const getBackendUrl = () => {
  const backendUrl =
    process.env.BACKEND_URL || "http://localhost:5000";

  return backendUrl.replace(/\/+$/, "");
};

const getFrontendUrl = () => {
  const frontendUrl =
    process.env.FRONTEND_URL || "http://localhost:5173";

  return frontendUrl.replace(/\/+$/, "");
};

const getEmailProvider = () => {
  return (process.env.EMAIL_PROVIDER || "resend").toLowerCase();
};

const getResendClient = () => {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    throw new Error(
      "RESEND_API_KEY is missing from the backend environment."
    );
  }

  return new Resend(apiKey);
};

const getSender = () => {
  const provider = getEmailProvider();

  if (provider === "mailtrap") {
    return (
      process.env.MAILTRAP_FROM ||
      "PharmaCore <no-reply@pharmacore.local>"
    );
  }

  return (
    process.env.EMAIL_FROM ||
    "PharmaCore <onboarding@resend.dev>"
  );
};

// =====================================================
// MAILTRAP SMTP TRANSPORT
// =====================================================

const getMailtrapTransport = () => {
  const host =
    process.env.MAILTRAP_HOST || "sandbox.smtp.mailtrap.io";

  const port = Number(process.env.MAILTRAP_PORT || 2525);

  const username = process.env.MAILTRAP_USERNAME;
  const password = process.env.MAILTRAP_PASSWORD;

  if (!username || !password) {
    throw new Error(
      "MAILTRAP_USERNAME and MAILTRAP_PASSWORD must be configured."
    );
  }

  if (!Number.isInteger(port) || port <= 0) {
    throw new Error("MAILTRAP_PORT must be a valid port number.");
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    requireTLS: port !== 465,
    auth: {
      user: username,
      pass: password,
    },
    connectionTimeout: 15000,
    greetingTimeout: 15000,
    socketTimeout: 20000,
  });
};

// =====================================================
// ROLE LABELS
// =====================================================

const getRoleLabel = (role) => {
  const roleLabels = {
    superadmin: "Super Administrator",
    admin: "Administrator",
    pharmacist: "Pharmacist",
    cashier: "Cashier",
    inventory_manager: "Inventory Manager",
    procurement: "Procurement Officer",
  };

  return roleLabels[role] || "Staff Member";
};

// =====================================================
// HTML HELPERS
// =====================================================

const escapeHtml = (value = "") => {
  return String(value).replace(/[&<>"']/g, (character) => {
    const entities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };

    return entities[character];
  });
};

const createEmailTemplate = ({
  firstName,
  heading,
  message,
  buttonText,
  buttonUrl,
  footerMessage,
}) => {
  const safeName = escapeHtml(firstName || "there");
  const safeHeading = escapeHtml(heading);
  const safeMessage = escapeHtml(message);
  const safeButtonText = escapeHtml(buttonText || "");
  const safeButtonUrl = escapeHtml(buttonUrl || "");
  const safeFooter = escapeHtml(footerMessage || "");

  const buttonSection =
    buttonText && buttonUrl
      ? `
        <div style="text-align: center; margin: 30px 0;">
          <a
            href="${safeButtonUrl}"
            style="
              display: inline-block;
              padding: 15px 28px;
              background: #7c3aed;
              color: #ffffff;
              text-decoration: none;
              border-radius: 9px;
              font-size: 14px;
              font-weight: bold;
            "
          >
            ${safeButtonText}
          </a>
        </div>

        <p style="
          margin: 28px 0 8px;
          color: #71717a;
          font-size: 12px;
          line-height: 1.7;
        ">
          If the button does not work, copy and paste
          this link into your browser:
        </p>

        <p style="
          margin: 0;
          word-break: break-all;
          font-size: 12px;
          line-height: 1.7;
        ">
          <a
            href="${safeButtonUrl}"
            style="color: #7c3aed;"
          >
            ${safeButtonUrl}
          </a>
        </p>
      `
      : "";

  return `
  <!DOCTYPE html>
  <html>
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>PharmaCore</title>
    </head>

    <body style="
      margin: 0;
      padding: 0;
      background-color: #f4f4f7;
      font-family: Arial, Helvetica, sans-serif;
      color: #27272a;
    ">

      <table
        width="100%"
        cellpadding="0"
        cellspacing="0"
        role="presentation"
        style="padding: 40px 12px;"
      >
        <tr>
          <td align="center">

            <table
              width="100%"
              cellpadding="0"
              cellspacing="0"
              role="presentation"
              style="
                max-width: 560px;
                background: #ffffff;
                border-radius: 16px;
                overflow: hidden;
              "
            >

              <tr>
                <td style="
                  background: #181326;
                  padding: 30px 35px;
                  text-align: center;
                ">
                  <h1 style="
                    margin: 0;
                    color: #ffffff;
                    font-size: 27px;
                    letter-spacing: 0.5px;
                  ">
                    Pharma<span style="color: #a78bfa;">Core</span>
                  </h1>

                  <p style="
                    margin: 8px 0 0;
                    color: #c4b5fd;
                    font-size: 12px;
                    letter-spacing: 2px;
                    text-transform: uppercase;
                  ">
                    Pharmacy Management System
                  </p>
                </td>
              </tr>

              <tr>
                <td style="padding: 38px 35px;">

                  <p style="
                    margin: 0 0 12px;
                    color: #71717a;
                    font-size: 14px;
                  ">
                    Hello ${safeName},
                  </p>

                  <h2 style="
                    margin: 0 0 18px;
                    color: #18181b;
                    font-size: 23px;
                    line-height: 1.4;
                  ">
                    ${safeHeading}
                  </h2>

                  <p style="
                    margin: 0 0 28px;
                    color: #52525b;
                    font-size: 15px;
                    line-height: 1.8;
                    white-space: pre-line;
                  ">
                    ${safeMessage}
                  </p>

                  ${buttonSection}

                  <p style="
                    margin: 28px 0 0;
                    color: #71717a;
                    font-size: 12px;
                    line-height: 1.7;
                  ">
                    ${safeFooter}
                  </p>

                </td>
              </tr>

              <tr>
                <td style="
                  padding: 22px;
                  background: #fafafa;
                  border-top: 1px solid #eeeeee;
                  text-align: center;
                ">
                  <p style="
                    margin: 0;
                    color: #a1a1aa;
                    font-size: 11px;
                    line-height: 1.7;
                  ">
                    This is an automated message from PharmaCore.
                    Please do not reply directly to this email.
                  </p>
                </td>
              </tr>

            </table>

          </td>
        </tr>
      </table>

    </body>
  </html>
  `;
};

// =====================================================
// SHARED EMAIL SENDER
// =====================================================

const sendEmail = async ({
  to,
  subject,
  firstName,
  heading,
  message,
  buttonText,
  buttonUrl,
  footerMessage,
}) => {
  if (!to) {
    throw new Error("Email recipient is required.");
  }

  const html = createEmailTemplate({
    firstName,
    heading,
    message,
    buttonText,
    buttonUrl,
    footerMessage,
  });

  const textParts = [
    `Hello ${firstName || "there"},`,
    "",
    heading,
    "",
    message,
  ];

  if (buttonText && buttonUrl) {
    textParts.push("", `${buttonText}: ${buttonUrl}`);
  }

  if (footerMessage) {
    textParts.push("", footerMessage);
  }

  textParts.push("", "PharmaCore");

  const text = textParts.join("\n");

  const provider = getEmailProvider();

  // ---------------------------------------------------
  // MAILTRAP EMAIL SANDBOX
  // ---------------------------------------------------

  if (provider === "mailtrap") {
    const transporter = getMailtrapTransport();

    const info = await transporter.sendMail({
      from: getSender(),
      to,
      subject,
      html,
      text,
    });

    console.log(
      `PharmaCore email accepted by Mailtrap Sandbox. Message ID: ${info.messageId}`
    );

    return info;
  }

  // ---------------------------------------------------
  // RESEND EMAIL DELIVERY
  // ---------------------------------------------------

  if (provider === "resend") {
    const resend = getResendClient();

    const { data, error } = await resend.emails.send({
      from: getSender(),
      to: [to],
      subject,
      html,
      text,
    });

    if (error) {
      console.error("Resend email delivery failed:", error);

      throw new Error(error.message || "Unable to send email.");
    }

    console.log(
      `PharmaCore email sent successfully through Resend. Email ID: ${data?.id}`
    );

    return data;
  }

  throw new Error(
    `Unsupported EMAIL_PROVIDER: ${provider}. Use "mailtrap" or "resend".`
  );
};

// =====================================================
// EMAIL VERIFICATION
// =====================================================

const sendVerificationEmail = async ({
  email,
  firstName,
  token,
}) => {
  const verificationUrl =
    `${getBackendUrl()}/api/auth/verify-email/${encodeURIComponent(token)}`;

  return sendEmail({
    to: email,
    subject: "Verify your email address | PharmaCore",
    firstName,
    heading: "Verify your email address",
    message:
      "Welcome to PharmaCore. Please verify your email address to confirm that you own this email account and continue with your account registration.",
    buttonText: "Verify Email Address",
    buttonUrl: verificationUrl,
    footerMessage:
      "If you did not request a PharmaCore account, you can safely ignore this email.",
  });
};

// =====================================================
// NEW USER INVITATION
// Used for invited staff and Admin accounts.
// The invitation token is accepted through the frontend.
// =====================================================

const sendUserInvitationEmail = async ({
  email,
  firstName,
  role,
  token,
  inviterName,
}) => {
  if (!token) {
    throw new Error("An invitation token is required.");
  }

  const roleLabel = getRoleLabel(role);

  const invitationUrl =
    `${getFrontendUrl()}/accept-invitation?token=${encodeURIComponent(token)}`;

  const isAdmin = role === "admin";

  const inviterText = inviterName
    ? `${inviterName} has invited you`
    : "You have been invited";

  const message = isAdmin
    ? `${inviterText} to join PharmaCore as an ${roleLabel}.\n\nUse the invitation link below to create your password and complete your account setup. Your account will remain inactive until the Super Admin activates it.`
    : `${inviterText} to join PharmaCore as a ${roleLabel}.\n\nUse the invitation link below to create your password and activate your account. Your assigned role has already been selected by the inviting administrator.`;

  return sendEmail({
    to: email,
    subject: `You have been invited to PharmaCore as ${roleLabel}`,
    firstName,
    heading: "Your PharmaCore invitation",
    message,
    buttonText: "Accept Invitation",
    buttonUrl: invitationUrl,
    footerMessage:
      "This invitation link is valid for 24 hours and can only be used once. If you were not expecting this invitation, please contact your PharmaCore administrator.",
  });
};

// =====================================================
// LEGACY ADMIN PASSWORD SETUP
// Retained for existing Admin invitations.
// =====================================================

const sendAdminPasswordSetupEmail = async ({
  email,
  firstName,
  token,
}) => {
  const passwordSetupUrl =
    `${getFrontendUrl()}/setup-admin-password?token=${encodeURIComponent(token)}`;

  return sendEmail({
    to: email,
    subject: "Complete your Admin account setup | PharmaCore",
    firstName,
    heading: "Your Admin invitation is ready",
    message:
      "Your email address has been verified. You have been invited to join PharmaCore as an Administrator. Set your password to complete your account setup. Your account will remain inactive until the Super Admin activates it.",
    buttonText: "Set Up My Password",
    buttonUrl: passwordSetupUrl,
    footerMessage:
      "If you were not expecting this invitation, please contact your PharmaCore administrator.",
  });
};

// =====================================================
// LEGACY STAFF REGISTRATION NOTIFICATION
// Sent ONLY to the Super Admin by authController.
// =====================================================

const sendNewStaffRegistrationNotificationEmail = async ({
  email,
  firstName,
  applicantName,
  applicantEmail,
  requestedRole,
}) => {
  const roleLabel = getRoleLabel(requestedRole);

  const approvalPageUrl =
    `${getFrontendUrl()}/user-approvals`;

  return sendEmail({
    to: email,
    subject: "New verified staff application | PharmaCore",
    firstName,
    heading: "A new staff application requires your attention",
    message:
      `A new staff applicant has verified their email address and is awaiting review.\n\n` +
      `Applicant: ${applicantName}\n` +
      `Email address: ${applicantEmail}\n` +
      `Requested role: ${roleLabel}\n\n` +
      "Please review the application and approve or reject it through the User Approvals section.",
    buttonText: "Review Application",
    buttonUrl: approvalPageUrl,
    footerMessage:
      "This notification was sent to the Super Admin because a new staff applicant completed email verification.",
  });
};

// =====================================================
// STAFF APPROVAL NOTIFICATION
// Retained for legacy applications.
// =====================================================

const sendStaffApprovalEmail = async ({
  email,
  firstName,
  role,
}) => {
  const roleLabel = getRoleLabel(role);

  const loginUrl =
    `${getFrontendUrl()}/login`;

  return sendEmail({
    to: email,
    subject: "Your staff application has been approved | PharmaCore",
    firstName,
    heading: "Your application has been approved!",
    message:
      `Your PharmaCore staff application has been approved. ` +
      `You have been assigned the role of ${roleLabel}. ` +
      "You can now sign in using your registered email address and password.",
    buttonText: "Sign In to PharmaCore",
    buttonUrl: loginUrl,
    footerMessage:
      "Welcome to PharmaCore. Please keep your login credentials secure.",
  });
};

// =====================================================
// STAFF REJECTION NOTIFICATION
// Retained for legacy applications.
// =====================================================

const sendStaffRejectionEmail = async ({
  email,
  firstName,
}) => {
  return sendEmail({
    to: email,
    subject: "Update on your staff application | PharmaCore",
    firstName,
    heading: "An update on your application",
    message:
      "Thank you for your interest in joining PharmaCore. After reviewing your staff application, we regret to inform you that it has not been approved.",
    footerMessage:
      "If you need further information about this decision, please contact your PharmaCore administrator.",
  });
};

// =====================================================
// EXPORTS
// =====================================================

module.exports = {
  sendVerificationEmail,
  sendUserInvitationEmail,
  sendAdminPasswordSetupEmail,
  sendNewStaffRegistrationNotificationEmail,
  sendStaffApprovalEmail,
  sendStaffRejectionEmail,
};