const Voting = artifacts.require("Voting");

module.exports = function (deployer) {
    const candidates = ["John", "Mery", "Abdul"];
    deployer.deploy(Voting, candidates);
};
