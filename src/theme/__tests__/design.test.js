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
    const {StyleSheet} = require('react-native');

    const style = getCardStyle(theme);

    expect(style.borderRadius).toBe(28);
    expect(style.backgroundColor).toBe(theme.glassBase);
    expect(style.borderWidth).toBe(StyleSheet.hairlineWidth);
    expect(style.borderColor).toBe(theme.materialBorder);
    expect(style.borderCurve).toBe('continuous');
    expect(style.shadowColor).toBe(theme.shadow);
  });
});