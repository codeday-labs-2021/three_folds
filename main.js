async function main() {

    // frick CORS
    const fold = {
        "file_spec": 1,
        "file_creator": "A text editor",
        "file_author": "Jason Ku",
        "file_classes": ["singleModel"],
        "frame_title": "Three-fold 3D example",
        "frame_classes": ["foldedForm"],
        "frame_attributes": ["3D"],
        "vertices_coords": [
          [0,1,0],
          [0,0,1],
          [0,-1,0],
          [1,0,0],
          [0,0,-1],
          [0,0,-1]
        ],
        "faces_vertices": [
          [0,1,2],
          [0,2,3],
          [0,4,1],
          [1,5,2]
        ],
        "edges_vertices": [
          [0,2],
          [0,1],
          [1,2],
          [2,3],
          [0,3],
          [1,4],
          [1,5],
          [0,4],
          [2,5]
        ],
        "edges_assignment": [
          "V",
          "M",
          "M",
          "B",
          "B",
          "B",
          "B",
          "B",
          "B"
        ],
        "faceOrders": [
          [2,0,-1],
          [3,0,-1]
        ]
    };

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
    // let svgElement = document.querySelector("svg");
    // let svgAspect = svgElement.clientHeight / svgElement.clientWidth;
    // const geometry = new THREE.PlaneGeometry(15, 15 * svgAspect);

    // // load textures and set up materials here
    // const frontMaterial = new THREE.MeshBasicMaterial({color: 0x80ff00, side: THREE.FrontSide});
    // const backMaterial = new THREE.MeshBasicMaterial({color: 0xffffff, side: THREE.BackSide});
    // const plane = new THREE.Group();

    // plane.add(new THREE.Mesh(geometry, frontMaterial));
    // plane.add(new THREE.Mesh(geometry, backMaterial));

    // scene.add(plane);
    let triangleGeometry = new THREE.BufferGeometry();
    // triangleGeometry.vertices = [new THREE.Vector3(2, 1, 0), new THREE.Vector3(1, 3, 0), new THREE.Vector3(3, 4, 0)];
    // console.log("TEST:", deepArrayConcat([], [1, 2, 2]));
    let cArray = deepArrayConcat(new Array(), fold["vertices_coords"]);
    const vertices = new Float32Array(cArray);
    console.log(cArray);
    triangleGeometry.setIndex(deepArrayConcat(new Array(), fold["faces_vertices"]));
    triangleGeometry.setAttribute("position", new THREE.BufferAttribute(vertices, 3));
    // triangleGeometry.faces = [new THREE.Face3(0, 1, 2)];
    let plane = new THREE.Mesh(triangleGeometry, new THREE.MeshBasicMaterial({color: 0x885556, side: THREE.DoubleSide}));
    scene.add(plane);

    const edges = new THREE.EdgesGeometry(triangleGeometry);
    const lines = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({color: 0xffffff}));
    scene.add(lines);

    let rotationRadius = 30;

    // rotation in XZ plane
    let theta = 0;

    // rotation in a plane along Y axis
    let phi = Math.PI / 2;

    let isCamRotating = false;
    let zoomLimit = 2;
    // const sensitivityScaleXY = 0.01;

    // prevent right clicks from opening the context menu anywhere
    document.addEventListener("contextmenu", e => {
        e.preventDefault();
    });

    // when clicking into the canvas, start rotating
    canvas.addEventListener("mousedown", e => {
        isCamRotating = true;
    });

    // listen for mouse release on the whole page to prevent accidental sticky rotate
    document.addEventListener("mouseup", e => {
        if (isCamRotating) {
            isCamRotating = false;
        }
    });

    let restrictionRangeY = 0.05;

    // orbit the camera upon mouse movement in the canvas
    canvas.addEventListener("mousemove", e => {
        if (isCamRotating) {
            theta -= degToRad(e.movementX);
            let n = phi - degToRad(e.movementY);
            if (n > Math.PI - restrictionRangeY) {
                phi = Math.PI - restrictionRangeY;
            } else if (n < restrictionRangeY) {
                phi = restrictionRangeY;
            } else {
                phi = n;
            }
        }
    });

    // use scroll wheel to zoom
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

        let sphCoords = new THREE.Spherical(rotationRadius, phi, theta);
        camera.position.setFromSpherical(sphCoords);
        camera.lookAt(0, 0, 0);

        renderer.render(scene, camera);
    }


    function degToRad(degrees) {
        return degrees * (Math.PI / 180);
    }

    /**
     * Helper function to cancatenate two arrays even if they have nested arrays inside
     * @param {Array} array1 The array to be concatenated to
     * @param {Array} array2 The array to concatenate onto array1
     */
    function deepArrayConcat(array1, array2) {
        console.log(array1, array2);
        if (array2.some(el => Array.isArray(el))) {
            console.log("Deep concat needed");
            array2.forEach(element => {
                if (Array.isArray(element)) {
                    array1 = deepArrayConcat(array1, element);
                } else {
                    array1 = array1.concat(element);
                }
            });
            console.log("M1:", array1);
            return array1;
        } else {
            console.log("No deep concat");
            array1 = array1.concat(array2);
            console.log(array1);
            return array1;
        }
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