function main() {
    const canvas = document.querySelector("#glCanvas");
    // Initialize the GL context
    const gl = canvas.getContext("webgl");
  
    // Only continue if WebGL is available and working
    if (gl === null) {
      alert("Unable to initialize WebGL. Your browser or machine may not support it.");
      return;
    }
  
    // Set clear color to black, fully opaque
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    // Clear the color buffer with specified clear color
    gl.clear(gl.COLOR_BUFFER_BIT);
  }
  
// window.onload = main;
  
function drawVertLine(){
  // data 
  const vertices_coords = simpleJsonObj['vertices_coords']
  const edges_vertices = simpleJsonObj['edges_vertices']

  const svgns = "http://www.w3.org/2000/svg";
  let newRect = document.createElementNS(svgns, "rect");

        // draw rectangle
        newRect.setAttribute("x", vertices_coords[0][0]);
        newRect.setAttribute("y", vertices_coords[0][0]);
        newRect.setAttribute("width", "800");
        newRect.setAttribute("height", "600");
        newRect.setAttribute("fill", "#5cceee");
        newRect.setAttribute("stroke", "black");
        newRect.setAttribute('stroke-width', '.5');
      
        // append the new rectangle to the svg
        svg.appendChild(newRect);

  // draws line
  for (const edge of edges_vertices) {
    let newline = document.createElementNS(svgns, "line");

      console.log('Looking at edge ', edge);
      // x coordniate
      const from_vertex_index = edge[0];
      // y coordniate
      const to_vertex_index = edge[1];

      console.log(`  |- Draw a line from #${from_vertex_index} -> #${to_vertex_index}`);
      const from_coords = vertices_coords[from_vertex_index];
      const to_coords = vertices_coords[to_vertex_index];

      console.log(`  |- Line coordinates are from `, from_coords, ' to ', to_coords);


      // draw line 

      newline.setAttribute('x1',from_coords[0] * 100) ;
      newline.setAttribute('y1', from_coords[1] * 100);
      newline.setAttribute('x2', to_coords[0] * 100);
      newline.setAttribute('y2', to_coords[1] * 100) ;
      newline.setAttribute('stroke-width', '.5');
      newline.setAttribute("stroke", "white")
      newline.setAttribute('stroke-dasharray', "6")
      console.log("***************from__coords***8",from_coords[0])
      console.log("***************to_coords****",to_coords[1])
      svg.appendChild(newline);






  // variable for the namespace 

  // make a simple rectangle



// vertixs array for rect min and max

 
  }

  // loop over edges arrays for line

}


window.onload = function() {
  main();
  // drawSvg();
  drawVertLine();
}







