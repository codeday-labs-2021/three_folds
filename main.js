function main() {
    const canvas = document.getElementById("glCanvas");

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

    // init our plane shape, make it same proportions as svg
    let svgElement = document.querySelector("svg");
    let svgAspect = svgElement.clientHeight / svgElement.clientWidth;
    // console.log(svgAspect);
    const geometry = new THREE.PlaneGeometry(15, 15 * svgAspect);

    // load textures and set up materials here
    const frontMaterial = new THREE.MeshBasicMaterial({color: 0x80ff00, side: THREE.FrontSide});
    const backMaterial = new THREE.MeshBasicMaterial({color: 0xffffff, side: THREE.BackSide});
    const plane = new THREE.Group();

    plane.add(new THREE.Mesh(geometry, frontMaterial));
    plane.add(new THREE.Mesh(geometry, backMaterial));

    scene.add(plane);

    let rotationRadius = 30;

    // rotation in XZ plane
    let theta = 0;

    // rotation in a plane along Y axis
    let phi = Math.PI / 2;

    let isCamRotating = false;
    let zoomLimit = 10;
    // const sensitivityScaleXY = 0.01;

    // prevent right clicks from opening the context menu anywhere
    document.addEventListener("contextmenu", e => {
        // if (isCamRotating) {
            e.preventDefault();
        // }
    });

    canvas.addEventListener("mousedown", e => {
        isCamRotating = true;
    });

    document.addEventListener("mouseup", e => {
        // e.preventDefault();
        // console.log("MouseUP event fired");
        if (isCamRotating) {
            isCamRotating = false;
        }
    });

    let restrictionRangeY = 0.05;
    canvas.addEventListener("mousemove", e => {
        if (isCamRotating) {
            theta -= degToRad(e.movementX);
            let n = phi - degToRad(e.movementY);
            // console.log(n)
            if (n > Math.PI - restrictionRangeY) {
                phi = Math.PI - restrictionRangeY;
            } else if (n < restrictionRangeY) {
                phi = restrictionRangeY;
            } else {
                phi = n;
            }
        }
    });

    canvas.addEventListener("wheel", e => {
        e.preventDefault();
        let newZoom = rotationRadius + e.deltaY * 0.1;
        if (newZoom < zoomLimit) {
            rotationRadius = zoomLimit;
        } else {
            rotationRadius = newZoom;
        }
    });

    function animate() {
        requestAnimationFrame(animate);

        // rotationDegree += rotationOffset;
        // camera.position.x = rotationRadius * Math.sin(degToRad(rotationDegree));
        // camera.position.z = rotationRadius * Math.cos(degToRad(rotationDegree));
        // calculate position from theta and phi
        let sphCoords = new THREE.Spherical(rotationRadius, phi, theta);
        camera.position.setFromSpherical(sphCoords);
        // console.log(camera.position);
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