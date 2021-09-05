// const { expect } = require('chai');
const { shallowMount } = require('@vue/test-utils');
const Nav = require('../../src/components/Nav.vue');

describe('Nav.vue unit tests', () => {
  it('should render all pages', () => {
    const pages = {
      page1: {
        link: 'pageLink'
      }
    };
    shallowMount(Nav, {
      props: { pages }
    });
  });
});
