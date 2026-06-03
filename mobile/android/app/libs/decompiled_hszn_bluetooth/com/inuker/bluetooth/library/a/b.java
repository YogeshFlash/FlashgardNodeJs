/*
 * Decompiled with CFR 0.152.
 */
package com.inuker.bluetooth.library.a;

import com.inuker.bluetooth.library.e.c;

public class b {
    public int a;
    public int b;
    public byte[] c;

    public String toString() {
        String string = "";
        StringBuilder stringBuilder = new StringBuilder();
        stringBuilder.append(String.format("@Len = %02X, @Type = 0x%02X", this.a, this.b));
        switch (this.b) {
            case 8: 
            case 9: {
                string = "%c";
                break;
            }
            default: {
                string = "%02X ";
            }
        }
        stringBuilder.append(" -> ");
        StringBuilder stringBuilder2 = new StringBuilder();
        try {
            for (byte by : this.c) {
                stringBuilder2.append(String.format(string, by & 0xFF));
            }
            stringBuilder.append(stringBuilder2.toString());
        }
        catch (Exception exception) {
            stringBuilder.append(com.inuker.bluetooth.library.e.c.b(this.c));
        }
        return stringBuilder.toString();
    }
}

