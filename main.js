async function main() {

    // frick CORS
    const fold = {
        "file_spec": 1,
        "file_creator": "Mathematica",
        "file_author": "Thomas Hull",
        "file_classes": ["singleModel"],
        "frame_title": "Rigidly folded square twist",
        "frame_classes": ["foldedForm"],
        "frame_attributes": ["3D"],
        "vertices_coords": [
            [
                0,
                0,
                0
            ],
            [
                0.25,
                0,
                0
            ],
            [
                0.25,
                0.5,
                0
            ],
            [
                0,
                0.5,
                0
            ],
            [
                0.466968,
                0,
                -0.124197
            ],
            [
                0.966968,
                0,
                -0.124197
            ],
            [
                0.966968,
                0.25,
                -0.124197
            ],
            [
                0.466968,
                0.25,
                -0.124197
            ],
            [
                0.716968,
                0.354037,
                0.103128
            ],
            [
                0.966968,
                0.354037,
                0.103128
            ],
            [
                0.966968,
                0.854037,
                0.103128
            ],
            [
                0.716968,
                0.854037,
                0.103128
            ],
            [
                0,
                0.854037,
                0.227324
            ],
            [
                0,
                0.604037,
                0.227324
            ],
            [
                0.5,
                0.604037,
                0.227324
            ],
            [
                0.5,
                0.854037,
                0.227324
            ]
        ],
        "faces_vertices": [
            [
                0,
                1,
                2,
                3
            ],
            [
                1,
                4,
                7,
                2
            ],
            [
                4,
                5,
                6,
                7
            ],
            [
                7,
                6,
                9,
                8
            ],
            [
                8,
                9,
                10,
                11
            ],
            [
                15,
                14,
                8,
                11
            ],
            [
                12,
                13,
                14,
                15
            ],
            [
                3,
                2,
                14,
                13
            ],
            [
                2,
                7,
                8,
                14
            ]
        ],
        "edges_vertices": [
            [
                0,
                1
            ],
            [
                1,
                2
            ],
            [
                2,
                3
            ],
            [
                3,
                0
            ],
            [
                4,
                5
            ],
            [
                5,
                6
            ],
            [
                6,
                7
            ],
            [
                7,
                4
            ],
            [
                8,
                9
            ],
            [
                9,
                10
            ],
            [
                10,
                11
            ],
            [
                11,
                8
            ],
            [
                12,
                13
            ],
            [
                13,
                14
            ],
            [
                14,
                15
            ],
            [
                15,
                12
            ],
            [
                2,
                7
            ],
            [
                7,
                8
            ],
            [
                8,
                14
            ],
            [
                14,
                2
            ],
            [
                3,
                13
            ],
            [
                1,
                4
            ],
            [
                6,
                9
            ],
            [
                11,
                15
            ]
        ],
        "edges_assignment": [
            "B",
            "M",
            "V",
            "B",
            "B",
            "B",
            "V",
            "V",
            "M",
            "B",
            "B",
            "V",
            "B",
            "M",
            "M",
            "B",
            "V",
            "M",
            "M",
            "V",
            "B",
            "B",
            "B",
            "B"
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
    // concatenating an empty array is a bit of a hack
    let cArray = deepArrayConcat(new Array(), fold["vertices_coords"]);
    const vertices = new Float32Array(cArray);
    let faces = fold["faces_vertices"];
    if (faces.some(el => el.length > 3)) {
        faces = polygonToTri(faces);
    }
    triangleGeometry.setIndex(deepArrayConcat(new Array(), faces));
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
    let zoomMax = 30;
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
        } else if (newZoom > zoomMax) {
            rotationRadius = zoomMax;
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
     * @returns {Array} The result of deep concatenation
     */
    function deepArrayConcat(array1, array2) {
        if (array2.some(el => Array.isArray(el))) {
            array2.forEach(element => {
                if (Array.isArray(element)) {
                    array1 = deepArrayConcat(array1, element);
                } else {
                    array1 = array1.concat(element);
                }
            });
            return array1;
        } else {
            array1 = array1.concat(array2);
            return array1;
        }
    }

    /**
     * Function to split polygonal faces into triangles for rendering
     * @param {Array} array A list of faces made by referencing indexed vertices
     * @returns {Array} The original array modified to have many triangles instead of polygons
     */
    function polygonToTri(array) {
        let outArray = [];
        for (let i = 0; i < array.length; i++) {
            let len = array[i].length;
            if (len === 3) {
                outArray.push(array[i]);
            } else if (len === 4) { // unsure about higher polygons so only handle rect
                // get the last three elements, then get the first three elements
                outArray.push(array[i].slice(0, 3));
                /*
                 * since the face has its vertices listed in a consistent counterclockwise or
                 * clockwise order, we don't need the first three then last three, we need
                 * the first three, then the triangle opposite that is formed by the last two
                 * vertices andt the first one
                 * this hack does that by moving the first element to the last to slice the same
                 */
                let shifted = array[i];
                shifted.push(array[i].shift())
                outArray.push(shifted.slice(-3));
            } else if (len < 3 || len > 4) {
                alert("Polygon rendering encountered unexpected shapes");
            }
        }
        return outArray;
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