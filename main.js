"use strict";

// import * as FOLD from "external/fold.js";
const FOLD = require("fold");
// const THREE = require("three");

function main() {
    let fileInput = document.getElementById("fold_input");
    let reRender = false;
    fileInput.addEventListener("change", event => {
        const fileList = event.target.files;
        render(fileList[0], reRender);
        reRender = true;
    })
}

function render(file, reRender) {
    let fReader = new FileReader();
    fReader.addEventListener("load", event => {
        let text = fReader.result;
        let foldObj = JSON.parse(text);
        render2D(foldObj, reRender);
        render3D(foldObj, reRender);
    });
    fReader.readAsText(file);
}

function render2D(foldObj, reRender) {

    const svgns = "http://www.w3.org/2000/svg";
    let creaseFrameExists = false;
    let svg = document.getElementById("svg");
    let mathLines = [];

    drawVertLine();
    initSVGListeners(reRender);

    function drawVertLine(){
        // data
        let frame = foldObj["file_frames"];
        if (frame) {
            for (let i = 0; i < frame.length; i++) {
                if (frame[i]["frame_classes"][0] === "creasePattern") {
                    frame = frame[i];
                    creaseFrameExists = true;
                }
            }
        }

        // not gonna handle inheritance, just expect creasePattern to have all info
        let vertices_coords, edges_vertices;
        if (creaseFrameExists) {
            vertices_coords = frame["vertices_coords"];
            edges_vertices = frame["edges_vertices"];
        } else {
            FOLD.convert.flatFoldedGeometry(foldObj);
            vertices_coords = foldObj["vertices_flatFoldCoords"];
            edges_vertices = foldObj['edges_vertices'];
        }

        let newRect = document.createElementNS(svgns, "rect");

        // draw rectangle
        newRect.setAttribute("x", vertices_coords[0][0]);
        newRect.setAttribute("y", vertices_coords[0][0]);
        newRect.setAttribute("width", 800);
        newRect.setAttribute("height", 600);
        newRect.setAttribute("fill", "#5cceee");
        newRect.setAttribute("stroke", "black");
        newRect.setAttribute('stroke-width', '.2')

        // append the new rectangle to the svg
        svg.appendChild(newRect);
        console.log(svg);

        // find line information to adjust and scale them to the viewport
        let [xOffset, yOffset] = [0, 0];
        let [minX, maxX] = [Infinity, -Infinity];
        let [minY, maxY] = [Infinity, -Infinity];
        let lines = [];
        for (const edge of edges_vertices) {

            // console.log('Looking at edge ', edge);
            // x coordniate
            const from_vertex_index = edge[0];
            // y coordniate
            const to_vertex_index = edge[1];


            // console.log(`  |- Draw a line from #${from_vertex_index} -> #${to_vertex_index}`);
            const from_coords = vertices_coords[from_vertex_index];
            const to_coords = vertices_coords[to_vertex_index];

            let line = from_coords.concat(to_coords);
            lines.push(line);

            // this part finds the max offsets so everything can be shifted into a viewable position
            let x1 = from_coords[0];
            let x2 = to_coords[0];
            if (x1 < 0 || x2 < 0) {
                xOffset = Math.max(Math.abs(x2), Math.abs(x1), xOffset);
            }
            let y1 = from_coords[1];
            let y2 = to_coords[1];
            if (y1 < 0 || y2 < 0) {
                yOffset = Math.max(Math.abs(y2), Math.abs(y1), yOffset);

            }

            // for scaling purposes, hopefully only needs to be done once
            minX = Math.min(minX, x1, x2);
            maxX = Math.max(maxX, x1, x2);
            minY = Math.min(minY, y1, y2);
            maxY = Math.max(maxY, y1, y2);
            // console.log(`  |- Line coordinates are from `, from_coords, ' to ', to_coords);
        }

        // getting the max X and Y size of the viewbox
        let viewportDim = document.querySelector("svg").viewBox.baseVal;
        let xScale = viewportDim["width"] / (maxX - minX);
        let yScale = viewportDim["height"] / (maxY - minY);

        // draw crease lines
        for (let i = 0; i < lines.length; i++) {


            let line = lines[i];

            line[0] = (line[0] + xOffset) * xScale;
            line[1] = (line[1] + yOffset) * yScale;
            line[2] = (line[2] + xOffset) * xScale;
            line[3] = (line[3] + yOffset) * yScale;

            let newline = document.createElementNS(svgns, "line");
            newline.setAttribute('x1', line[0]);
            newline.setAttribute('y1', line[1]);
            newline.setAttribute('x2', line[2]);
            newline.setAttribute('y2', line[3]);
            newline.setAttribute('stroke-width', '2');
            newline.setAttribute("stroke", "white")
            newline.setAttribute('stroke-dasharray', "2")
            // console.log("***************from__coords****",from_coords[0])
            // console.log("***************to_coords****",to_coords[1])
            svg.appendChild(newline);

            // also construct the lines into THREE math objects
            mathLines.push(new THREE.Line3(new THREE.Vector3(line[0], line[1], 0),
                new THREE.Vector3(line[2], line[3], 0)));
        }





        // variable for the namespace

        // make a simple rectangle



      // vertixs array for rect min and max

        // loop over edges arrays for line

    }

    function initSVGListeners(reRender) {
        if (!reRender) {
            svg.addEventListener("click", e => {
                console.log("the SVG was clicked");
                clickAPoint(e);
            });
        }
    }

    /**
     * Handles the behavior upon clicking on the SVG
     * @param {Object} event The click event from the listener
     */
    function clickAPoint(event) {
        let x = event.offsetX;
        let y = event.offsetY;
        console.log("I registered a click at: " + x + ", " + y);

        let clickPosition = new THREE.Vector3(x, y, 0);
        let closestPoints = mathLines.map(line => {
            console.log(line);
            let p = new THREE.Vector3();
            line.closestPointToPoint(clickPosition, true, p);
            return p;
        });
        let pointDistances = closestPoints.map(point => point.distanceTo(clickPosition));
        let min = 0;
        for (let i = 0; i < pointDistances.length; i++) {
            if (pointDistances[i] < pointDistances[min]) {
                min = i;
            }
        }
        let closestPoint = closestPoints[min];

        let circle = document.createElementNS(svgns, "circle");
        circle.setAttribute("cx", closestPoint.x);
        circle.setAttribute("cy", closestPoint.y);
        circle.setAttribute("r", 5);
        svg.appendChild(circle);
    }


    function findNearestVert(){

        // loop through the vertices and calculate the distance between the vertex and where ever the user is

        const vertices_coords = foldObj['vertices_coords']
        const edges_vertices = foldObj['edges_vertices']


        for (const edge of edges_vertices) {

            console.log('Looking at edge ', edge);
            // x coordniate
            const from_vertex_index = edge[0];
            // y coordniate
            const to_vertex_index = edge[1];

            // console.log(`  |- Draw a line from #${from_vertex_index} -> #${to_vertex_index}`);
            // const from_coords = vertices_coords[from_vertex_index];
            // const to_coords = vertices_coords[to_vertex_index];

            // console.log(`  |- Line coordinates are from `, from_coords, ' to ', to_coords);


            // draw line

            console.log(Math.hypot(edge[0],edge[1],24,10));

        }
    }

}

function render3D(foldObj, reRender) {

    let canvas, scene, camera, renderer;

    // the fold object that gets passed in
    let rotationRadius = 5;

    // rotation in XZ plane
    let theta = 0;

    // rotation in a plane along Y axis
    let phi = Math.PI / 2;

    // camera limits and settings
    let isCamRotating = false;
    let isCamPanning = false;
    let zoomLimit = 2;
    let zoomMax = 30;
    let restrictionRangeY = 0.05;
    const sensitivityScale = 0.01;
    const zoomSensitivity = 0.01;
    let origin = new THREE.Vector3(0, 0, 0);

    initRenderer();
    init3DListeners(reRender);
    loadShapes();
    animate();

    // init THREE.js rendering stuff
    function initRenderer() {
        canvas = document.getElementById("glCanvas");

        // working with WebGL context will be for the most part unnecessary as Three.js handles it
        scene = new THREE.Scene();
        camera = new THREE.PerspectiveCamera(80, canvas.width / canvas.height, 0.1, 1000);

        // pass in canvas DOM element for Three to draw to
        renderer = new THREE.WebGLRenderer({
            canvas: canvas
        });

        // set up cam size
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.setSize(canvas.width, canvas.height);

        camera.position.setZ(rotationRadius);
    }

    function loadShapes() {
        // clear the scene of existing objects
        scene.clear();
        let shapes = [];

        if (foldObj["file_frames"]) {
            // assuming one frame is creases and other is 3D folded shape
            for (let i = 0; i < foldObj["file_frames"].length; i++) {
                let frame = foldObj["file_frames"][i];

                // these class names are now specific to our implementation
                if (frame["frame_classes"].includes("foldedForm")) { // only add shape if it's 3D
                    let verts = frame["vertices_coords"];
                    let faces = frame["faces_vertices"];

                    // handle inheriting attributes if they don't exist in this frame
                    if (!verts) {
                        // ugly
                        verts = foldObj["file_frames"][frame["frame_parent"]]["vertices_coords"];
                    }
                    if (!faces) {
                        faces = foldObj["file_frames"][frame["frame_parent"]]["faces_vertices"];
                    }
                    let createdGeom = createFaceGeom(verts, faces);

                    // in case of failure somehow do not add it to the scene
                    if (createdGeom) {
                        shapes.push(createdGeom);
                    }
                }
            }
        } else {
            shapes.push(createFaceGeom(foldObj["vertices_coords"], foldObj["faces_vertices"]));
        }

        shapes.forEach(shape => {
            scene.add(shape);
            const edges = new THREE.EdgesGeometry(shape.geometry);
            const lines = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({
                color: 0xffffff,
            }));
            scene.add(lines);
        })

        // default to using the first shape as the center as there is no way to calc it w/ >1 shapes
        shapes[0].geometry.computeBoundingSphere();
        origin = shapes[0].geometry.boundingSphere.center; // the origin that the cam orbits around
        rotationRadius = shapes[0].geometry.boundingSphere.radius * 1.7;
    }

    // stop loading repeat listeners, what do i do with the leftover 'lost' listeners?
    function init3DListeners(reRender) {
        // some listeners require access to the objects in this instance of the function

        // when clicking into the canvas, start rotating
        canvas.addEventListener("mousedown", e => {
            if (e.button === 0) {
                isCamRotating = true;
            } else if (e.button === 2) {
                isCamPanning = true;
            }
        });

        // listen for mouse release on the whole page to prevent accidental sticky rotate
        document.addEventListener("mouseup", e => {
            if (isCamRotating || isCamPanning) {
                isCamRotating = false;
                isCamPanning = false;
            }
        });

        // orbit the camera upon mouse movement in the canvas, pan if right clicked
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
            } else if (isCamPanning) { // prevent both pan and rotate at same time
                origin.setComponent(0, origin.x - (e.movementX * sensitivityScale)); // x axis movement
                origin.setComponent(2, origin.z - (e.movementY * sensitivityScale));
            }
        });

        // use scroll wheel to zoom
        canvas.addEventListener("wheel", e => {
            e.preventDefault();
            let newZoom = rotationRadius + e.deltaY * zoomSensitivity;
            if (newZoom < zoomLimit) {
                rotationRadius = zoomLimit;
            } else if (newZoom > zoomMax) {
                rotationRadius = zoomMax;
            } else {
                rotationRadius = newZoom;
            }
        });

        if (!reRender) {
            // prevent right clicks from opening the context menu anywhere
            document.addEventListener("contextmenu", e => {
                e.preventDefault();
            });
        }
    }

    function animate() {
        requestAnimationFrame(animate);

        let sphCoords = new THREE.Spherical(rotationRadius, phi, theta);
        camera.position.setFromSpherical(sphCoords);

        // offset spherical position to new origin as well for panning
        camera.position.addVectors(camera.position, origin);
        camera.lookAt(origin);

        renderer.render(scene, camera);
    }

    function createFaceGeom(vertex_coords, faces_vertices) {
        // both have to exist in order for the shape to be rendered
        if (vertex_coords && faces_vertices) {
            let triangleGeometry = new THREE.BufferGeometry();

            if (vertex_coords.some(el => el.length !== 3)) {
                vertex_coords = enforce3DCoordinates(vertex_coords);
            }

            // concatenating an empty array is a bit of a hack, bascially just squish the array
            let vertsArray = deepArrayConcat(new Array(), vertex_coords);
            vertsArray = mathCoordConversion(vertsArray);
            const vertices = new Float32Array(vertsArray);

            // check if there are any faces of more than three vertices
            if (faces_vertices.some(el => el.length > 3)) {
                faces_vertices = polygonToTri(faces_vertices);
            }
            triangleGeometry.setIndex(deepArrayConcat(new Array(), faces_vertices));
            triangleGeometry.setAttribute("position", new THREE.BufferAttribute(vertices, 3));

            let plane = new THREE.Mesh(triangleGeometry,
                new THREE.MeshBasicMaterial({color: 0x885556, side: THREE.DoubleSide}));
            return plane;
        } else {
            alert("A shape was missing necessary information to be rendered");
            return null;
        }
    }


    function degToRad(degrees) {
        return degrees * (Math.PI / 180);
    }

    /**
     * Given an array of arrays representing points, pads 'points' that do not have three values
     * with zeroes on the end, removes the last element of 'points' that have four elements. Does
     * not handle 'points' with n < 2 or n > 4 elements. This is necessary because FOLD objects
     * sometimes do not store the third value in the point, and assume it to be zero.
     * @param {Array} pointList A list of Arrays, representing points in 3D space
     * @returns {Array} The same list but with every point modified to be in 3D
     */
    function enforce3DCoordinates(pointList) {
        let outArray = [];
        for (let i = 0; i < pointList.length; i++) {
            let point = pointList[i];
            if (point.length === 2) {
                outArray = outArray.concat(point);
                outArray.push(0);
            } else if (point.length === 4) {
                point.pop();
                outArray = outArray.concat(point);
            } else {
                outArray = outArray.concat(point);
            }
        }
        return outArray;
    }

    /**
     * Helper function to cancatenate two arrays even if they have nested arrays inside
     * @param {Array} array1 The array to be concatenated to
     * @param {Array} array2 The array to concatenate onto array1
     * @returns {Array} The result of deep concatenation
     */
    function deepArrayConcat(array1, array2) {
        // TODO: handle in more graceful manner
        if (!array2) {
            alert("Something went wrong with coordinate arrays");
        }
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
     * Function to split an array of indexed vertices as faces into triangles if they aren't already
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
                 * vertices and the first one
                 * this does that by moving the first element
                 */
                let shifted = array[i];
                shifted.push(array[i].shift())
                outArray.push(shifted.slice(-3));
            } else if (len < 3 || len > 4) {
                // TODO: replace with better alert when frontend is more permanent
                alert("Polygon rendering encountered unexpected shapes");
            }
        }
        return outArray;
    }

    /**
     * Helper function to convert from XYZ (FOLD) to XZY (THREE.js) and possibly back as well. Used
     * on arrays of values every 3 representing one point, like after calling deepArrayConcat() on
     * the vertices from FOLD
     * @param {Array} coordsArray An array of coordinates where every 3 values is one point
     * @returns A converted array where the second and third values of each coord are swapped
     */
    function mathCoordConversion(coordsArray) {
        let outArray = [];
        for (let i = 0; i < coordsArray.length; i++) {
            let specialIndex = (i + 1) % 3;
            if (!(specialIndex === 2)) {
                outArray.push(coordsArray[i]);
            }
            if (specialIndex === 0) {
                outArray.push(coordsArray[i - 1]);
            }
        }
        return outArray;
    }
}

window.onload = function() {
    main();
}