declare const process: {
    env: {
        APP_VERSION?: string;
    }
};

export default {
    version: process.env.APP_VERSION || "2025.05.26 - 1.397"
}; 