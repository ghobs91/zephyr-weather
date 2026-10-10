const {formatDistance} = require('../formatting');

describe('formatDistance', () => {
  it('formats in kilometres when the user selects km', () => {
    expect(formatDistance(500, 'km')).toBe('500 m');
    expect(formatDistance(9000, 'km')).toBe('9.0 km');
    expect(formatDistance(16093, 'km')).toBe('16 km');
  });

  it('formats in miles when the user selects miles', () => {
    expect(formatDistance(1609.344, 'mi')).toBe('1.0 mi');
    expect(formatDistance(16093.44, 'mi')).toBe('10 mi');
  });

  it('falls back when the distance is missing', () => {
    expect(formatDistance(undefined, 'mi')).toBe('--');
    expect(formatDistance(undefined, 'km')).toBe('--');
  });
});
