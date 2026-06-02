'use client';

import { useState } from 'react';

export default function ContactForm() {
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setStatus('Cranking the amplifier...');

    const formData = new FormData(e.currentTarget);
    const payload = Object.fromEntries(formData);

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        body: JSON.stringify(payload),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (res.ok) {
        setStatus('Message received! We will get back to you soon.');
        (e.target as HTMLFormElement).reset();
      } else {
        const errData = await res.json().catch(() => ({}));
        setStatus(errData.error || 'Failed to send message. Please try again.');
      }
    } catch (err) {
      console.error(err);
      setStatus('Connection failed. Drop us a line at gaycdclola@gmail.com.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="contact-card" onSubmit={handleSubmit}>
      <h2>Send a Message</h2>
      <label>
        Name
        <input type="text" name="name" required placeholder="Chris" />
      </label>
      <label>
        Email
        <input type="email" name="email" required placeholder="chris@example.com" />
      </label>
      <label>
        Message
        <textarea name="message" rows={6} required placeholder="Your message here..."></textarea>
      </label>
      <button className="button" type="submit" disabled={loading}>
        {loading ? 'Sending...' : 'Send Message'}
      </button>
      {status && <p className="status">{status}</p>}
    </form>
  );
}
