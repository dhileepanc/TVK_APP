const APP_CONFIG = {
    app_name: process.env.APP_NAME || "Spider Naam Jap",
    android_url:
        process.env.ANDROID_APP_URL ||
        "https://play.google.com/store/apps/details?id=your.package.name",
    ios_url:
        process.env.IOS_APP_URL || "https://apps.apple.com/app/id0000000000",
};

module.exports = { APP_CONFIG };