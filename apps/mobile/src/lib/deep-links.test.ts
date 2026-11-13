import { describe, expect, it } from 'vitest';
import { routeForUrl } from './deep-links';

const id = '5b1c2a8e-1111-4222-8333-944455556666';

describe('routeForUrl', () => {
  it('opens a shared story from a universal link and from the custom scheme', () => {
    expect(routeForUrl(`https://links.example.test/s/${id}`, 'links.example.test', 'coeat')).toBe(`/story/${id}`);
    expect(routeForUrl(`coeat://s/${id}`, 'links.example.test', 'coeat')).toBe(`/story/${id}`);
  });

  it('opens polls and table joins', () => {
    expect(routeForUrl(`https://links.example.test/p/${id}`, 'links.example.test', 'coeat')).toBe(`/poll/${id}`);
    expect(routeForUrl(`https://links.example.test/t/abcdef0123456789`, 'links.example.test', 'coeat')).toBe('/group/join?token=abcdef0123456789');
  });

  it('ignores other hosts, schemes and malformed links', () => {
    expect(routeForUrl(`https://evil.example/s/${id}`, 'links.example.test', 'coeat')).toBeNull();
    expect(routeForUrl(`other://s/${id}`, 'links.example.test', 'coeat')).toBeNull();
    expect(routeForUrl('not a url', 'links.example.test', 'coeat')).toBeNull();
    expect(routeForUrl('https://links.example.test/s/short', 'links.example.test', 'coeat')).toBeNull();
  });
});
