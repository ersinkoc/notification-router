import { EmailAdapter } from '../../src/channels/adapters/emailAdapter';
import { MessageContent } from '../../src/types';

describe('BUG-003: XSS Vulnerability Fix in Email HTML Formatting', () => {
  let adapter: EmailAdapter;

  beforeEach(() => {
    adapter = new EmailAdapter();
  });

  test('should escape HTML tags in title', () => {
    const message: MessageContent = {
      title: '<script>alert("XSS")</script>',
      body: 'Normal body',
      data: {},
    };

    const html = (adapter as any).formatHtml(message);

    expect(html).not.toContain('<script>alert');
    expect(html).toContain('&lt;script&gt;');
  });

  test('should escape HTML tags in body', () => {
    const message: MessageContent = {
      body: '<img src=x>',
      data: {},
    };

    const html = (adapter as any).formatHtml(message);

    expect(html).toContain('&lt;img');
    expect(html).toContain('&gt;');
  });

  test('should escape quotes correctly', () => {
    const message: MessageContent = {
      body: 'He said "Hello"',
      data: {},
    };

    const html = (adapter as any).formatHtml(message);

    expect(html).toContain('&quot;');
  });

  test('should preserve newlines as br tags', () => {
    const message: MessageContent = {
      body: 'Line 1\nLine 2',
      data: {},
    };

    const html = (adapter as any).formatHtml(message);

    expect(html).toContain('Line 1<br>Line 2');
  });
});
