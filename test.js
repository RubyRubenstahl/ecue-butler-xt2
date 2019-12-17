const ButlerXT2 = require("./src/butler-xt2");

const butler = new ButlerXT2({});

// butler.fetchCuelistData().then(res => {
//   console.log(res);
// });

butler.fetchSettings().then(res => {
  console.log(res)
})

console.log("done");
