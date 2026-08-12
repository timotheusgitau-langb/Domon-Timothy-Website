const contactForm = document.querySelector('#contact-form');
let _contactHideTimer = null;

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
    const feedback = document.querySelector('#contact-feedback');

    // Reset feedback state immediately on submit
    if (feedback) {
      clearTimeout(_contactHideTimer);
      feedback.classList.remove('success', 'error');
      feedback.textContent = '';
    }

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

      if (response.ok) {
        contactForm.reset();
        if (feedback) {
          feedback.classList.remove('error');
          feedback.classList.add('success');
          feedback.textContent = 'Your message was sent to the admin. Thank you!';
          // ensure focus for keyboard/screen-reader users
          feedback.setAttribute('tabindex', '-1');
          try { feedback.focus(); } catch (e) { /* no-op */ }

          // Auto-hide after 6s
          _contactHideTimer = setTimeout(() => {
            feedback.classList.remove('success');
            feedback.textContent = '';
            feedback.removeAttribute('tabindex');
          }, 6000);
        }
      } else {
        const result = await response.json().catch(() => ({}));
        if (feedback) {
          feedback.classList.remove('success');
          feedback.classList.add('error');
          feedback.textContent = result.error || 'Unable to send message right now.';
          feedback.setAttribute('tabindex', '-1');
          try { feedback.focus(); } catch (e) { /* no-op */ }
          // keep error visible but remove after a bit longer
          _contactHideTimer = setTimeout(() => {
            feedback.classList.remove('error');
            feedback.textContent = '';
            feedback.removeAttribute('tabindex');
          }, 9000);
        }
      }
    } catch (error) {
      if (feedback) {
        clearTimeout(_contactHideTimer);
        feedback.classList.remove('success');
        feedback.classList.add('error');
        feedback.textContent = 'Network error. Please try again later.';
        feedback.setAttribute('tabindex', '-1');
        try { feedback.focus(); } catch (e) { /* no-op */ }
        _contactHideTimer = setTimeout(() => {
          feedback.classList.remove('error');
          feedback.textContent = '';
          feedback.removeAttribute('tabindex');
        }, 9000);
      }
    } finally {
      if (button) {
        button.disabled = false;
        button.textContent = 'Send message';
      }
    }
  });
}
