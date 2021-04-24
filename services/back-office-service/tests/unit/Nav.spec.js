const { expect } = require('chai');
const { shallowMount } = require('@vue/test-utils');
const Nav = require('../../src/components/Nav.vue');

console.log('hellom my man');
describe('Nav.vue unit tests', () => {
  it('should render all pages', () => {
    const pages = {
      page1: {
        link: 'pageLink'
      }
    };
    const wrapper = shallowMount(Nav, {
      props: { pages }
    });
    console.log(wrapper);
  });
});
