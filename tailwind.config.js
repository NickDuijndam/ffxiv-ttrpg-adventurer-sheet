var config = {
    content: ["./index.html", "./src/**/*.{ts,tsx}"],
    theme: {
        extend: {
            colors: {
                parchment: "#f2ede2",
                ink: "#3d3428",
                line: "#8f7c61",
                accent: "#746147"
            },
            fontFamily: {
                heading: ['"Cormorant Garamond"', "serif"],
                body: ['"Libre Franklin"', "sans-serif"]
            }
        }
    },
    plugins: []
};
export default config;
