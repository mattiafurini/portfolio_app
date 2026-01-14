module.exports = {
    apps: [
        {
            name: "portfolio-backend",
            cwd: "./backend",
            script: "dist/src/main.js",
            env: {
                NODE_ENV: "production",
            },
        },
        {
            name: "portfolio-frontend",
            cwd: "./frontend",
            script: "node_modules/next/dist/bin/next",
            args: "start -p 3002",
            env: {
                NODE_ENV: "production",
            },
        },
    ],
};
