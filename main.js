function main() {
    const canvas = document.getElementById("glCanvas");
    console.log(canvas.width, canvas.height);

    // working with WebGL context will be for the most part unnecessary as Three.js handles it
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(80, canvas.width / canvas.height, 0.1, 1000);

    // pass in canvas DOM element for Three to draw to
    const renderer = new THREE.WebGLRenderer({
        canvas: canvas
    });

    // set up cam size
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(canvas.width, canvas.height);

    camera.position.setZ(30);

    // init our plane shape
    const geometry = new THREE.PlaneGeometry(20, 20);

    // load textures and set up materials here
    const frontMaterial = new THREE.MeshBasicMaterial({color: 0x80ff00, side: THREE.FrontSide});
    const backMaterial = new THREE.MeshBasicMaterial({color: 0xffffff, side: THREE.BackSide});
    const plane = new THREE.Group();

    plane.add(new THREE.Mesh(geometry, frontMaterial));
    plane.add(new THREE.Mesh(geometry, backMaterial));

    scene.add(plane);

    let rotationRadius = 30;

    // by default the camera looks in the -Z or +Z directions, so this angle will start from Z axis
    let rotationDegree = 0;
    let rotationOffset = 1;
    function animate() {
        requestAnimationFrame(animate);

        rotationDegree += rotationOffset;
        camera.position.x = rotationRadius * Math.sin(degToRad(rotationDegree));
        camera.position.z = rotationRadius * Math.cos(degToRad(rotationDegree));
        camera.lookAt(0, 0, 0);

        renderer.render(scene, camera);
      }

    function degToRad(degrees) {
        return degrees * (Math.PI / 180);
    }

    // make some spheres to show the camera is orbiting, not just plane rotating
    function createSphere() {
        const geometry = new THREE.SphereGeometry(3);
        const material = new THREE.MeshBasicMaterial({color: 0xffffff});
        const sph = new THREE.Mesh(geometry, material);

        // using three math utils to randomize numbers
        const [x, y, z] = Array(3).fill().map(() => THREE.MathUtils.randFloatSpread(250));
        sph.position.set(x, y, z);
        scene.add(sph);
    }

    Array(50).fill().forEach(() => createSphere());

    animate();

}

window.onload = main;
