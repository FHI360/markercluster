'use strict';

/**
 * The CSSTransitionGroup component uses the 'transitionend' event, which
 * browsers will not send for any number of reasons, including the
 * transitioning node not being painted or in an unfocused tab.
 *
 * This TimeoutTransitionGroup instead uses a user-defined timeout to determine
 * when it is a good time to remove the component. Currently there is only one
 * timeout specified, but in the future it would be nice to be able to specify
 * separate timeouts for enter and leave, in case the timeouts for those
 * animations differ. Even nicer would be some sort of inspection of the CSS to
 * automatically determine the duration of the animation or transition.
 *
 * This is adapted from Facebook's CSSTransitionGroup which is in the React
 * addons and under the Apache 2.0 License.
 */

const React = require('react/addons');
const ReactTransitionGroup = React.addons.TransitionGroup;

const TICK = 17;

/**
 * EVENT_NAME_MAP is used to determine which event fired when a
 * transition/animation ends, based on the style property used to
 * define that event.
 */
let EVENT_NAME_MAP = {
  transitionend: {
    'transition': 'transitionend',
    'WebkitTransition': 'webkitTransitionEnd',
    'MozTransition': 'mozTransitionEnd',
    'OTransition': 'oTransitionEnd',
    'msTransition': 'MSTransitionEnd'
  },

  animationend: {
    'animation': 'animationend',
    'WebkitAnimation': 'webkitAnimationEnd',
    'MozAnimation': 'mozAnimationEnd',
    'OAnimation': 'oAnimationEnd',
    'msAnimation': 'MSAnimationEnd'
  }
};

let endEvents = [];

(function detectEvents() {
  if (typeof window === 'undefined') {
    return;
  }

  const testEl = document.createElement('div');
  const style = testEl.style;

  // On some platforms, in particular some releases of Android 4.x, the
  // un-prefixed 'animation' and 'transition' properties are defined on the
  // style object but the events that fire will still be prefixed, so we need
  // to check if the un-prefixed events are useable, and if not remove them
  // from the map
  if (!window.AnimationEvent) {
    delete EVENT_NAME_MAP.animationend.animation;
  }

  if (!window.TransitionEvent) {
    delete EVENT_NAME_MAP.transitionend.transition;
  }

  for (let baseEvents of Object.keys(EVENT_NAME_MAP)) {
    for (let styleName of Object.keys(EVENT_NAME_MAP[baseEvents])) {
      if (styleName in style) {
        endEvents.push(EVENT_NAME_MAP[baseEvents][styleName]);
        break;
      }
    }
  }
})();

function animationSupported() {
  return endEvents.length !== 0;
}

/**
 * Functions for element class management to replace dependency on jQuery
 * addClass, removeClass and hasClass
 */
function addClass(element, className) {
  if (element.classList) {
    element.classList.add(className);
  } else if (!hasClass(element, className)) {
    element.className = `${element.className} ${className}`;
  }

  return element;
}

function removeClass(element, className) {
  if (hasClass(className)) {
    if (element.classList) {
      element.classList.remove(className);
    } else {
      element.className = (` ${element.className} `)
        .replace(` ${className} `, ' ').trim();
    }
  }

  return element;
}

function hasClass(element, className) {
  if (element.classList) {
    return element.classList.contains(className);
  } else {
    return (` ${element.className} `).indexOf(` ${className} `) > -1;
  }
}

class TimeoutTransitionGroupChild extends React.Component {
  constructor() {
    super();

    this._transition = this._transition.bind(this);
    this._queueClass = this._queueClass.bind(this);
    this._flushClassNameQueue = this._flushClassNameQueue.bind(this);
  }

  _transition(animationType, finishCallback) {
    let node = React.findDOMNode(this);
    const className = `${this.props.name}-${animationType}`;
    const activeClassName = className + '-active';

    const endListener = () => {
      removeClass(node, className);
      removeClass(node, activeClassName);

      // Usually this optional callback is used for informing an owner of
      // a leave animation and telling it to remove the child.
      if (finishCallback) {
        finishCallback();
      }
    };

    if (!animationSupported()) {
      endListener();
    } else {
      if (animationType === 'enter') {
        this.animationTimeout = setTimeout(endListener, this.props.enterTimeout);
      } else if (animationType === 'leave') {
        this.animationTimeout = setTimeout(endListener, this.props.leaveTimeout);
      }
    }

    addClass(node, className);

    // Need to do this to actually trigger a transition.
    this._queueClass(activeClassName);
  }

  _queueClass(className) {
    this.classNameQueue.push(className);

    if (!this.timeout) {
      this.timeout = setTimeout(this._flushClassNameQueue, TICK);
    }
  }

  _flushClassNameQueue() {
    this.classNameQueue.forEach((name) => {
      addClass(React.findDOMNode(this), name);
    });

    this.classNameQueue.length = 0;
    this.timeout = null;
  }

  componentWillMount() {
    this.classNameQueue = [];
  }

  componentWillUnmount() {
    if (this.timeout) {
      clearTimeout(this.timeout);
    }

    if (this.animationTimeout) {
      clearTimeout(this.animationTimeout);
    }
  }

  componentWillEnter(done) {
    if (this.props.enter) {
      this._transition('enter', done);
    } else {
      done();
    }
  }

  componentWillLeave(done) {
    if (this.props.leave) {
      this._transition('leave', done);
    } else {
      done();
    }
  }

  render() {
    return React.Children.only(this.props.children);
  }
}

class TimeoutTransitionGroup extends React.Component {
  constructor() {
    super();

    this._wrapChild = this._wrapChild.bind(this);
  }

  _wrapChild(child) {
    return (
      <TimeoutTransitionGroupChild
        enterTimeout={this.props.enterTimeout}
        leaveTimeout={this.props.leaveTimeout}
        name={this.props.transitionName}
        enter={this.props.transitionEnter}
        leave={this.props.transitionLeave}
      >
        {child}
      </TimeoutTransitionGroupChild>
    );
  }

  render() {
    return (
      <ReactTransitionGroup
        {...this.props}
        childFactory={this._wrapChild}
      />
    );
  }
}

TimeoutTransitionGroup.propTypes = {
  enterTimeout: React.PropTypes.number.isRequired,
  leaveTimeout: React.PropTypes.number.isRequired,
  transitionName: React.PropTypes.string.isRequired,
  transitionEnter: React.PropTypes.bool,
  transitionLeave: React.PropTypes.bool,
};

TimeoutTransitionGroup.defaultProps = {
  transitionEnter: true,
  transitionLeave: true
};

module.exports = TimeoutTransitionGroup;
