import "@testing-library/jest-dom"

if (typeof window !== "undefined") {
  window.scrollTo = () => {}
  window.matchMedia =
    window.matchMedia ||
    function () {
      return {
        matches: false,
        addListener: function () {},
        removeListener: function () {},
      }
    }
}
