  /**
   * Prints the received response from the socket to MS Word
   * Texts are printed from the current cursor position
   * Prints only the first result from the response
   * As the first response is the best prediction
   * @param {string} text
   */
export const printInPowerPoint = async (text) => {
    await PowerPoint.run(async (context) => {
      const shapes = context.presentation.getSelectedShapes();
      const shapeCount = shapes.getCount();
      await context.sync();
      shapes.load("items");
      await context.sync();
      shapes.items.map(async (shape, index) => {
        console.log(shape.id);
        shape.load("textFrame/textRange");
        await context.sync();
        const textRange = shape.textFrame.textRange;
        textRange.text = textRange.text + " " + text;
        await context.sync();
      });
    });
  };