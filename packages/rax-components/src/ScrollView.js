import {Component, createElement, findDOMNode} from 'rax';
import {isWeex, isWeb} from 'universal-env';
import View from './View';

const DEFAULT_END_REACHED_THRESHOLD = 500;
const DEFAULT_SCROLL_CALLBACK_THROTTLE = 50;
const FULL_WIDTH = 750;

class ScrollView extends Component {
  static defaultProps = {
    scrollEventThrottle: DEFAULT_SCROLL_CALLBACK_THROTTLE,
    onEndReachedThreshold: DEFAULT_END_REACHED_THRESHOLD,
    showsHorizontalScrollIndicator: true,
    showsVerticalScrollIndicator: true,
    className: 'rax-scrollview',
  };

  lastScrollDistance = 0;
  lastScrollContentSize = 0;

  handleScroll = (e) => {
    if (isWeb) {
      if (this.props.onScroll) {
        this.props.onScroll(e);
      }

      if (this.props.onEndReached) {
        if (!this.scrollerNode) {
          this.scrollerNode = findDOMNode(this.refs.scroller);
          this.scrollerContentNode = findDOMNode(this.refs.contentContainer);

          this.scrollerNodeSize = this.props.horizontal ? this.scrollerNode.offsetWidth : this.scrollerNode.offsetHeight;
        }

        // NOTE：iOS7/8下使用offsetHeight/Width获取高/宽度值是屏幕高度，不符合期望，改成 scrollHeight/Width
        let scrollContentSize = this.props.horizontal ? this.scrollerNode.scrollWidth : this.scrollerNode.scrollHeight;
        let scrollDistance = this.props.horizontal ? this.scrollerNode.scrollLeft : this.scrollerNode.scrollTop;
        let isEndReached = scrollContentSize - scrollDistance - this.scrollerNodeSize < this.props.onEndReachedThreshold;

        let isScrollToEnd = scrollDistance > this.lastScrollDistance;
        let isLoadedMoreContent = scrollContentSize != this.lastScrollContentSize;

        if (isEndReached && isScrollToEnd && isLoadedMoreContent) {
          this.lastScrollContentSize = scrollContentSize;
          this.props.onEndReached(e);
        }

        this.lastScrollDistance = scrollDistance;
      }
    }
  }

  // Reset scroll state, only for web now.
  resetScroll = (options) => {
    if (isWeb) {
      this.lastScrollContentSize = 0;
      this.lastScrollDistance = 0;
    }
  }

  scrollTo = (options) => {
    let x = parseInt(options.x);
    let y = parseInt(options.y);

    if (isWeex) {
      let dom = require('@weex-module/dom');
      let contentContainer = findDOMNode(this.refs.contentContainer);
      dom.scrollToElement(contentContainer.ref, {
        offset: x || y || 0
      });
    } else {
      let pixelRatio = document.documentElement.clientWidth / FULL_WIDTH;

      if (x >= 0) {
        findDOMNode(this.refs.scroller).scrollLeft = pixelRatio * x;
      }

      if (y >= 0) {
        findDOMNode(this.refs.scroller).scrollTop = pixelRatio * y;
      }
    }
  }

  render() {
    let {
      id,
      style,
      scrollEventThrottle,
      showsHorizontalScrollIndicator,
      showsVerticalScrollIndicator,
      onEndReached,
      onEndReachedThreshold,
    } = this.props;

    // In weex must be int value
    onEndReachedThreshold = parseInt(onEndReachedThreshold, 10);

    const contentContainerStyle = [
      this.props.horizontal && styles.contentContainerHorizontal,
      this.props.contentContainerStyle,
    ];

    // bugfix: fix scrollview flex in ios 78
    if (!isWeex && !this.props.horizontal) {
      contentContainerStyle.push(styles.containerWebStyle);
    }

    if (this.props.style) {
      let childLayoutProps = ['alignItems', 'justifyContent']
        .filter((prop) => this.props.style[prop] !== undefined);

      if (childLayoutProps.length !== 0) {
        console.warn(
          'ScrollView child layout (' + JSON.stringify(childLayoutProps) +
            ') must be applied through the contentContainerStyle prop.'
        );
      }
    }

    const contentContainer =
      <View
        ref="contentContainer"
        style={contentContainerStyle}>
        {this.props.children}
      </View>;

    const baseStyle = this.props.horizontal ? styles.baseHorizontal : styles.baseVertical;

    const scrollerStyle = {
      ...baseStyle,
      ...this.props.style
    };

    let showsScrollIndicator = this.props.horizontal ? showsHorizontalScrollIndicator : showsVerticalScrollIndicator;

    if (isWeex) {
      return (
        <scroller
          id={id}
          style={scrollerStyle}
          showScrollbar={showsScrollIndicator}
          onLoadmore={onEndReached}
          loadmoreoffset={onEndReachedThreshold}
          scrollDirection={this.props.horizontal ? 'horizontal' : 'vertical'}
        >
          {contentContainer}
        </scroller>
      );
    } else {
      let handleScroll = this.handleScroll;
      if (scrollEventThrottle) {
        handleScroll = throttle(handleScroll, scrollEventThrottle);
      }

      if (!showsScrollIndicator && !document.getElementById('rax-scrollview-style')) {
        let styleNode = document.createElement('style');
        styleNode.id = 'rax-scrollview-style';
        document.head.appendChild(styleNode);
        styleNode.innerHTML = `.${this.props.className}::-webkit-scrollbar{display: none;}`;
      }

      scrollerStyle.webkitOverflowScrolling = 'touch';
      scrollerStyle.overflow = 'scroll';

      return (
        <View {...this.props} ref="scroller" style={scrollerStyle} onScroll={handleScroll}>
          {contentContainer}
        </View>
      );
    }
  }
}

function throttle(func, wait) {
  var ctx, args, rtn, timeoutID;
  var last = 0;

  function call() {
    timeoutID = 0;
    last = +new Date();
    rtn = func.apply(ctx, args);
    ctx = null;
    args = null;
  }

  return function throttled() {
    ctx = this;
    args = arguments;
    var delta = new Date() - last;
    if (!timeoutID)
      if (delta >= wait) call();
      else timeoutID = setTimeout(call, wait - delta);
    return rtn;
  };
}

const styles = {
  baseVertical: {
    flex: 1,
    flexDirection: 'column',
  },
  baseHorizontal: {
    flex: 1,
    flexDirection: 'row',
  },
  contentContainerHorizontal: {
    flexDirection: 'row',
  },
  containerWebStyle: {
    display: 'block',
  }
};

export default ScrollView;
