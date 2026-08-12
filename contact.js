const contactForm = document.querySelector('#contact-form');

if (contactForm) {
  contactForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const formData = new FormData(contactForm);
    const hiddenBotField = formData.get('bot-field');
    if (hiddenBotField) {
      return;
    }

    const payload = {
      name: formData.get('name')?.toString().trim(),
      email: formData.get('email')?.toString().trim(),
      subject: formData.get('subject')?.toString().trim(),
      message: formData.get('message')?.toString().trim(),
      'g-recaptcha-response': formData.get('g-recaptcha-response')?.toString().trim(),
    };

    const button = contactForm.querySelector('button[type="submit"]');
    if (button) {
      button.disabled = true;
      button.textContent = 'Sending…';
    }

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const feedback = document.querySelector('#contact-feedback');
      if (response.ok) {
        contactForm.reset();
        if (feedback) {
          feedback.textContent = 'Message sent successfully. Thank you!';
        }
      } else {
        const result = await response.json();
        if (feedback) {
          feedback.textContent = result.error || 'Unable to send message right now.';
        }
      }
    } catch (error) {
      const feedback = document.querySelector('#contact-feedback');
      if (feedback) {
        feedback.textContent = 'Network error. Please try again later.';
      }
    } finally {
      if (button) {
        button.disabled = false;
        button.textContent = 'Send message';
      }
    }
  });
}
