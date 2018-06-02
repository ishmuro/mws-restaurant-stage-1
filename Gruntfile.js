module.exports = function(grunt) {
    grunt.initConfig({
        pkg: grunt.file.readJSON ('package.json'),
        responsive_images: {
            gen_img: {
                options: {
                    engine: "im",
                    concurrency: 4,
                    sizes: [
                        {
                            name: "small",
                            width: 320,
                            quality: 40,
                        },
                        {
                            name: "medium",
                            width: 640,
                            quality: 50,
                        },
                        {
                            name: "large",
                            width: 800,
                            quality: 60
                        }
                    ],
                },
                files: [{
                    expand: true,
                    src: ["*.jpg"],
                    cwd: "img/",
                    dest: "assets/images/"
                }],
            }
        }
    });

    grunt.loadNpmTasks('grunt-responsive-images');
}