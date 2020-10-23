module.exports = {
  "branches": ["master"],
  "plugins": [
    ["@semantic-release/commit-analyzer", {
      "preset": "angular",
      "parserOpts": {
        "noteKeywords": ["BREAKING CHANGE", "BREAKING CHANGES", "BREAKING"]
      }
    }],
    ["@semantic-release/release-notes-generator", {
      "preset": "angular",
    }],
    ["@semantic-release/npm", {
      "npmPublish": true,
    }],
    ["@semantic-release/exec", {
      "prepareCmd": "make release",
      "publishCmd": "python scripts/deploy_s3.py --version ${nextRelease.version}",
      "failCmd": "npm unpublish datadive-js@${nextRelease.version}"
    }],
    ["@semantic-release/github", {
      "assets": "datadive*.js"
    }],
    ["@semantic-release/git", {
      "assets": ["package.json", "src/datadive-snippet.js"],
      "message": "chore(release): ${nextRelease.version} [skip ci]\n\n${nextRelease.notes}"
    }],
  ],
}
