document.addEventListener('DOMContentLoaded', function() {

  // Use buttons to toggle between views
  document.querySelector('#inbox').addEventListener('click', () => load_mailbox('inbox'));
  document.querySelector('#sent').addEventListener('click', () => load_mailbox('sent'));
  document.querySelector('#archived').addEventListener('click', () => load_mailbox('archive'));
  document.querySelector('#compose').addEventListener('click', compose_email);

  // By default, load the inbox
  load_mailbox('inbox');
});

// Checks if the string is email or not.
// Credits: StackOverflow
function validateEmail(email) {
  const re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  return re.test(String(email).toLowerCase());
}

// 1. DONE
function compose_email() {

  // Show compose view and hide other views
  var emailsView = document.querySelector('#emails-view');
  var composeView = document.querySelector('#compose-view');
  var emailView = document.querySelector('#email-view');
  emailsView.style.display = 'none';
  composeView.style.display = 'block';
  emailView.style.display = 'none';

  var message = document.querySelector("#message");
  message.innerHTML = '';

  // Clear out composition fields
  var recipients = document.querySelector('#compose-recipients');
  var subject = document.querySelector('#compose-subject');
  var body = document.querySelector('#compose-body');
  recipients.value = '';
  subject.value = '';
  body.value = '';

  var composeForm = document.querySelector('#compose-form');
  composeForm.onsubmit = () => {
    send_email();
    return false;
  };
}

function send_email() {
    var recipients = document.querySelector('#compose-recipients');
    var subject = document.querySelector('#compose-subject');
    var body = document.querySelector('#compose-body');

    var message = document.querySelector("#message");
    message.innerHTML = "";

    // Empty recipient(s) input
    if (recipients.value == "") {
      message.innerHTML = "Enter at least one email address. <br />"

    // NOT Empty recipient(s) input
    } else {

      // Checking validity of recipient addresses
      var addressList = recipients.value.split(", ");
      var allValid = true;
      for (let address of addressList) {
        if (!validateEmail(address)) {
          allValid = false;
        }
      }

      // Recipient(s) invalid
      if (!allValid) {
        message.innerHTML = "INVALID ADDRESS(ES). Enter valid email addresses, and separate each with \", \" <br />";

      // NOT Recipient(s) invalid
      } else {

        // Variable for checking if all valid email addresses
        var allSuccessful = true;

        // Variables to keep track of async operations
        // Process all addresses first before deciding to redirect or not
        var asyncCounter = 0;
        var asyncFinish = addressList.length;

        for (let address of addressList) {
          fetch('/emails', {
                method: 'POST',
                body: JSON.stringify({
                    recipients: addressList,
                    subject: subject.value,
                    body: body.value
                })
              })
              .then(response => response.json())
              .then(result => {
                // Print result
                  console.log(result);

                  // CANNOT find address
                  if (result['error'] != null) {
                    allSuccessful = false;
                    message.innerHTML += result['error'] + "<br />";
                  // Can find address
                  } else {
                    message.innerHTML += `${address} sent successfully.` + "<br />";
                  }

                  // Add that finished one async operation
                  asyncCounter++;

                  // Now choose if redirect or not
                  if (asyncCounter == asyncFinish) {

                      if (allSuccessful) {
                        message.innerHTML += "[Redirecting to Sent Inbox in a sec...] <br />";
                        var delayInMilliseconds = 1000; // 1 second
                        setTimeout(function() {
                          load_mailbox('sent')
                        }, delayInMilliseconds);

                      } else {
                        // Do nothing, so user can check what went wrong
                        message.innerHTML += "[Automatic redirecting stopped. Please check your addresses.] <br />";
                      }
                  }
              });
        }
      }
    }
}

// 2.
function load_mailbox(mailbox) {

  // Show the mailbox and hide other views
  var emailsView = document.querySelector('#emails-view');
  var composeView = document.querySelector('#compose-view');
  var emailView = document.querySelector('#email-view');
  emailsView.style.display = 'block';
  composeView.style.display = 'none';
  emailView.style.display = 'none';

  emailsView.innerHTML = `<h3>${mailbox}</h3>`;

  // Show the mailbox name
  fetch(`/emails/${mailbox}`)
    .then(response => response.json())
    .then(emails => {
      if (emails.length == 0) {
        emailsView.innerHTML += '<p>This mailbox is currently empty.</p>';
      } else {

        for (let email of emails) {

          if (email.archived && mailbox == 'inbox') {
            // do not display if archived and inbox
          } else {
            const emailDisplay = document.createElement('div');
            emailDisplay.style.border = '1px solid';
            if (email.read) {
              emailDisplay.style.backgroundColor = 'lightgrey';
            } else {
              emailDisplay.style.backgroundColor = 'white';
            }
            emailDisplay.innerHTML += "<b>Subject: " + email.subject + "<b /><br />";
            emailDisplay.innerHTML += "From: " + email.sender + "<br />";
            emailDisplay.innerHTML += "Recipient(s): ";
            for (let recipient of email.recipients) {
                emailDisplay.innerHTML += recipient + "; ";
            }
            emailDisplay.innerHTML += "<br />";
            emailDisplay.innerHTML += "Timestamp: " + email.timestamp + "<br />";


            emailDisplay.addEventListener('click', () => load_email(email));

            emailsView.appendChild(emailDisplay);

                // ADDING BUTTONS HERE

              // mark as read/unread button
              var unreadButton = document.createElement('button');
              unreadButton.setAttribute("class", "btn btn-sm btn-outline-primary");

              if (email.read) {
                unreadButton.innerText = 'Mark as Unread';
              } else {
                unreadButton.innerText = 'Mark as Read';
              }

              unreadButton.addEventListener('click', () => {
                fetch(`/emails/${email.id}`, {
                  method: 'PUT',
                  body: JSON.stringify({
                    read: !(email.read)
                  })
                }).then(() => load_mailbox(mailbox));
              });

              emailsView.appendChild(unreadButton);

              // archive/ unarchive buttons
              if (mailbox != 'sent') {
                var toggleArchive = document.createElement('button');

                toggleArchive.setAttribute("class", "btn btn-sm btn-outline-primary");

                if (email.archived) {
                  toggleArchive.innerText = 'Unarchive';
                } else {
                  toggleArchive.innerText = 'Archive';
                }

                toggleArchive.addEventListener('click', () => {
                  fetch(`/emails/${email.id}`, {
                    method: 'PUT',
                    body: JSON.stringify({
                      archived: !(email.archived)
                    })
                  }).then(() => load_mailbox('inbox'));
                });

                emailsView.appendChild(toggleArchive);
              }
          }
        }
      }
    });

}

// 4.
//shows the email you clicked on from mailbox
function load_email(email) {

      var emailsView = document.querySelector('#emails-view');
      var composeView = document.querySelector('#compose-view');
      var emailView = document.querySelector('#email-view');
      emailsView.style.display = 'none';
      composeView.style.display = 'none';
      emailView.style.display = 'block';

      // GET request
      fetch(`/emails/${email.id}`)
        .then(response => response.json())
        .then(email => {

            // clear emailView
            emailView.innerHTML = '';

            // Header for email
            var header = document.createElement('div');

            // Elements for header + body
            var id = document.createElement('h3');
            var subject = document.createElement('h3');
            var recipients = document.createElement('h6');
            var sender = document.createElement('h6');
            var datetime = document.createElement('h6');

            var body = document.createElement('p');

            subject.innerHTML = email.subject;
            sender.innerHTML = `From: ${email.sender}`
            recipients.innerHTML = 'Recipient(s): ';
            for (let recipient of email.recipients) {
                recipients.innerHTML += recipient + "; ";
            }
            datetime.innerText = `Timestamp: ${email.timestamp}`;
            body.innerText = email.body;

            // Append to header
            header.appendChild(subject);
            header.appendChild(sender);
            header.appendChild(recipients);
            header.appendChild(datetime);

            // Mark read as true
            if (!email.read) {
                fetch(`/emails/${email.id}`, {
                    method: 'PUT',
                    body: JSON.stringify({
                    read: true
                })
              })
            }

          // ADDING BUTTONS HERE

          // Reply button

          var reply = document.createElement('button');
          reply.setAttribute("class", "btn btn-sm btn-outline-primary");
          reply.innerText = 'Reply';

          header.appendChild(reply);

          // Add reply function
          reply.addEventListener('click', () => {

            compose_email();

            document.querySelector('#compose-recipients').value = email.sender;
            document.querySelector('#compose-body').value = `On ${email.timestamp}, ${email.sender} wrote: ${email.body}`;

            if (email.subject.search('Re: ') != -1) {
              document.querySelector('#compose-subject').value = `${email.subject}`;
            } else {
              document.querySelector('#compose-subject').value = `Re: ${email.subject}`;
            }
          });

          // Append to mail view: header and body
          emailView.appendChild(header);
          var divider = document.createElement('hr');
          emailView.appendChild(divider);
          emailView.appendChild(body);

        })

}
