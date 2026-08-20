const {colors} = require('../colors');
const {getCardStyle, getScreenGradient, withAlpha} = require('../design');

describe('design helpers', () => {
  it('converts hex colors into rgba strings with the requested opacity', () => {
    const baseColor = '#56D6F8';

    const result = withAlpha(baseColor, 0.25);

    expect(result).toBe('rgba(86, 214, 248, 0.25)');
  });

  it('returns the atmospheric gradient stops for the active theme', () => {
    const theme = colors.dark;

    const gradient = getScreenGradient(theme);

    expect(gradient).toEqual([
      theme.heroSkyTop,
      theme.heroSkyMid,
      theme.heroSkyBottom,
    ]);
  });

  it('builds elevated card styles with the shared radius and border treatment', () => {
    const theme = colors.dark;

    const style = getCardStyle(theme);

    expect(style.borderRadius).toBe(32);
    expect(style.backgroundColor).toBe(theme.glassBase);
    expect(style.borderWidth).toBe(0);
    expect(style.shadowColor).toBe(theme.shadow);
  });
});