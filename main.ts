/**
 * Import the HuskyLens library
 */
/**
 * Set the starting class to 0
 */
/**
 * Define the button states
 */
let currentClass = 0
let buttonBPressed = false
let buttonAPressed = false
// Define the classes
let classes = [
"background",
"T-Shirt",
"Pants",
"Dress",
"Face",
"Pattern Shirt"
]
// Main loop
basic.forever(function () {
    // Check for button A press
    if (input.buttonIsPressed(Button.A)) {
        // Increment the current class
        currentClass += 1
        // Wrap back around to 0 if we reach 6
        if (currentClass >= 6) {
            currentClass = 0
        }
        // Write the class name to the HuskyLens
        huskylens.writeName(currentClass, classes[currentClass])
        // Wait a bit to avoid multiple button presses being registered
        basic.pause(500)
    }
    // Check for button B press
    if (input.buttonIsPressed(Button.B)) {
        // Write the current class ID to the HuskyLens to train it
        huskylens.writeLearn1(currentClass)
        // Wait for button B to be released
        while (input.buttonIsPressed(Button.B)) {
            basic.pause(50)
        }
    }
    // Check for button A+B press
    if (input.buttonIsPressed(Button.AB)) {
        // Reset the HuskyLens training model
        huskylens.forgetLearn()
        // Wait for both buttons to be released
        while (input.buttonIsPressed(Button.AB)) {
            basic.pause(50)
        }
    }
})
