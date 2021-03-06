import * as React from 'react';
import { StyleSheet, I18nManager, StyleProp, ViewStyle } from 'react-native';
import Animated, { Easing } from 'react-native-reanimated';

import memoize from './memoize';
import { Route, SceneRendererProps, NavigationState } from './types';

export type GetTabWidth = (index: number) => number;

export type Props<T extends Route> = SceneRendererProps & {
  navigationState: NavigationState<T>;
  width: string;
  style?: StyleProp<ViewStyle>;
  getTabWidth: GetTabWidth;
  fitWidth?: boolean;
};

const { interpolate, multiply, Extrapolate } = Animated;

export default class TabBarIndicator<T extends Route> extends React.Component<
  Props<T>
> {
  componentDidMount() {
    this.fadeInIndicator();
  }

  componentDidUpdate() {
    this.fadeInIndicator();
  }

  private fadeInIndicator = () => {
    const { navigationState, layout, width, getTabWidth } = this.props;

    if (
      !this.isIndicatorShown &&
      width === 'auto' &&
      layout.width &&
      // We should fade-in the indicator when we have widths for all the tab items
      navigationState.routes.every((_, i) => getTabWidth(i))
    ) {
      this.isIndicatorShown = true;

      Animated.timing(this.opacity, {
        duration: 150,
        toValue: 1,
        easing: Easing.in(Easing.linear),
      }).start();
    }
  };

  private isIndicatorShown = false;

  private opacity = new Animated.Value(this.props.width === 'auto' ? 0 : 1);

  private getTranslateX = memoize(
    (
      position: Animated.Node<number>,
      routes: Route[],
      getTabWidth: GetTabWidth,
      fitWidth
    ) => {
      const inputRange = routes.map((_, i) => i);

      // every index contains widths at all previous indices
      const outputRange = routes.reduce<number[]>((acc, _, i) => {
        if (i === 0) return [0];
        return [...acc, acc[i - 1] + getTabWidth(i - 1) + (fitWidth ? 40 : 0)];
      }, []);

      const translateX = interpolate(position, {
        inputRange,
        outputRange,
        extrapolate: Extrapolate.CLAMP,
      });

      return multiply(translateX, I18nManager.isRTL ? -1 : 1);
    }
  );

  private getWidth = memoize(
    (
      position: Animated.Node<number>,
      routes: Route[],
      getTabWidth: GetTabWidth
    ) => {
      const inputRange = routes.map((_, i) => i);
      const outputRange = inputRange.map(getTabWidth);

      return interpolate(position, {
        inputRange,
        outputRange,
        extrapolate: Extrapolate.CLAMP,
      });
    }
  );

  render() {
    const {
      position,
      navigationState,
      getTabWidth,
      width,
      style,
      layout,
      fitWidth,
    } = this.props;

    const { routes } = navigationState;

    const translateX =
      routes.length > 1
        ? this.getTranslateX(position, routes, getTabWidth, fitWidth)
        : 0;

    const indicatorWidth =
      width === 'auto'
        ? routes.length > 1
          ? this.getWidth(position, routes, getTabWidth)
          : getTabWidth(0)
        : width;

    return (
      <Animated.View
        style={[
          styles.indicator,
          // If layout is not available, use `left` property for positioning the indicator
          // This avoids rendering delay until we are able to calculate translateX
          { width: indicatorWidth, marginHorizontal: fitWidth ? 20 : 0 },
          layout.width
            ? { transform: [{ translateX }] as any }
            : { left: `${(100 / routes.length) * navigationState.index}%` },
          width === 'auto' ? { opacity: this.opacity } : null,
          style,
        ]}
      />
    );
  }
}

const styles = StyleSheet.create({
  indicator: {
    backgroundColor: '#ffeb3b',
    position: 'absolute',
    left: 0,
    bottom: 0,
    right: 0,
    height: 2,
  },
});
