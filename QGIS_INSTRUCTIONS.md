## Instructions for getting to QGIS to edit bus loop information

1. Find the microSD card (likely inside a microSD to SD card adapter) labeled **RPi QGIS**

2. Insert it into a Raspberry Pi (preferably a Raspberry Pi 3 Model B+)

3. Boot the RPi (have it connected to a monitor and keyboard)

4. Log in to the RPi (wait for the prompt to show) (username and password are provided on the SD card adapter's attached note)

5. Ensure that SSH is enabled by entering the command `sudo raspi-config`

6. Without disconnecting the power, disconnect the RPi from the monitor and keyboard

7. Connect the RPi to a computer with a GUI via an ethernet cable (preferably running any modern operating system besides one in the Microsoft Windows family)

8. In the terminal for the other computer, enter the command `ifconfig` and search for an IP Address similar to 172.17.0.1

9. With that IP Address, enter the command `ssh -Y pi@THAT_IP_ADDRESS`

10. If the terminal prompts whether or not to trust the computer being ssh's into, please type `yes`

11. Log in to the RPi again with the same username and password as before

12. Enter the command `qgis`

13. Once complete using QGIS, turn off the RPi with the command `sudo poweroff`

## Instructions for using QGIS to edit bus loop information

1. [Insert step one here]

2. [Insert step two here]
