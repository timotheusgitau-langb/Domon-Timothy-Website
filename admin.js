async function fetchMessages() {
  const response = await fetch('/api/messages');
  if (!response.ok) {
    throw new Error('Unable to load messages.');
  }
  return response.json();
}

async function deleteMessage(id) {
  const response = await fetch(`/api/messages/${id}`, { method: 'DELETE' });
  if (!response.ok) {
    throw new Error('Unable to delete message.');
  }
}

async function clearAllMessages() {
  const response = await fetch('/api/messages', { method: 'DELETE' });
  if (!response.ok) {
    throw new Error('Unable to clear messages.');
  }
}

async function markAllRead() {
  const response = await fetch('/api/messages/mark-all-read', { method: 'POST' });
  if (!response.ok) {
    throw new Error('Unable to mark messages read.');
  }
}

function createActionButton(label, className, onClick) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = `button ${className}`;
  button.textContent = label;
  button.addEventListener('click', onClick);
  return button;
}

async function loadMessages() {
  const messages = await fetchMessages();
  const tbody = document.querySelector('#messages-body');

  if (!tbody) return;
  tbody.innerHTML = '';

  messages.forEach((message) => {
    const row = document.createElement('tr');
    if (!message.read) {
      row.classList.add('message-unread');
    }

    const statusCell = document.createElement('td');
    statusCell.textContent = message.read ? 'Read' : 'Unread';

    const receivedCell = document.createElement('td');
    receivedCell.textContent = new Date(message.timestamp).toLocaleString();

    const nameCell = document.createElement('td');
    nameCell.textContent = message.name;

    const emailCell = document.createElement('td');
    const emailLink = document.createElement('a');
    emailLink.href = `mailto:${message.email}`;
    emailLink.textContent = message.email;
    emailCell.appendChild(emailLink);

    const subjectCell = document.createElement('td');
    subjectCell.textContent = message.subject;

    const messageCell = document.createElement('td');
    messageCell.textContent = message.message;

    const actionsCell = document.createElement('td');
    const deleteButton = createActionButton('Delete', 'button-ghost', async () => {
      if (!confirm('Delete this message permanently?')) return;
      try {
        await deleteMessage(message.id);
        await loadMessages();
      } catch (error) {
        alert(error.message);
      }
    });
    actionsCell.appendChild(deleteButton);

    row.append(statusCell, receivedCell, nameCell, emailCell, subjectCell, messageCell, actionsCell);
    tbody.appendChild(row);
  });
}

async function setupAdminControls() {
  const markAllReadButton = document.querySelector('#mark-all-read');
  const deleteAllButton = document.querySelector('#delete-all');

  if (markAllReadButton) {
    markAllReadButton.addEventListener('click', async () => {
      try {
        await markAllRead();
        await loadMessages();
      } catch (error) {
        alert(error.message);
      }
    });
  }

  if (deleteAllButton) {
    deleteAllButton.addEventListener('click', async () => {
      if (!confirm('Delete all stored messages permanently?')) return;
      try {
        await clearAllMessages();
        await loadMessages();
      } catch (error) {
        alert(error.message);
      }
    });
  }
}

loadMessages().then(setupAdminControls).catch(console.error);
