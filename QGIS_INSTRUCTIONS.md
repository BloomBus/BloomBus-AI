## Instructions for getting to QGIS to edit bus loop information

1. Find the microSD card (likely inside a microSD to SD card adapter) labeled **RPi QGIS**

2. Insert it into a Raspberry Pi (RPi) (preferably a RPi 3 Model B+)

3. Boot the RPi (have it connected to a monitor and keyboard)

4. Log in to the RPi (wait for the prompt to show) (login information is provided on the SD card adapter's attached note)

5. Ensure the RPi is connected to the internet by entering the command `sudo raspi-config` go into **Networking Options** and then **Wi-fi** and enter the SSID (name) of the Wi-fi network to connect to. (typically this will be bloomu (without a password))

6. Ensure that SSH is enabled by entering the command `sudo raspi-config` go into **Interfacing Options** and then **SSH**

7. From the pi user directory, (which is where logging in should automatically put you) do `cd ./Documents/bash_scripts`

8. Execute the networking script with the command `sudo bash ./001.install-networking.sh`

9. If it asks to edit anything, provide the answer `y` (or yes)

10. Without disconnecting the power, disconnect the RPi from the monitor and keyboard

11. Connect the RPi to a computer with a GUI via an ethernet cable (preferably running a Unix-like operating system)

12. In the terminal for the other computer, enter the command `ip a s` and search for an IP Address similar to 172.16.1.1 (if you find something like 172.16.1.10 and it doesn't work, try it without the ending 0)

13. With that IP Address, enter the command `ssh -Y pi@THAT_IP_ADDRESS`

14. If the terminal prompts whether or not to trust the computer being ssh's into, please type `yes`

15. Log in to the RPi again with the same password as before

16. Enter the command `qgis`

17. After QGIS starts up, if you want to continue to use the ssh session for RPi use the command `Ctrl+Z` (`Command+Z` on macOS) followed by `bg`

18. Once complete using QGIS, turn off the RPi with the command `sudo poweroff`

<p align="center">OR</p>

19. Exit the ssh session with `exit` and then unplug the RPi

## Instructions for using QGIS to edit bus loop information

1. [Insert step one here]

2. [Insert step two here]

## Troubleshooting
