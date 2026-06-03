/*
 * Decompiled with CFR 0.152.
 */
package com.inuker.bluetooth.library;

public class h {
    public static final int a = 0;
    public static final int b = -1;
    public static final int c = -2;
    public static final int d = -3;
    public static final int e = -4;
    public static final int f = -5;
    public static final int g = -6;
    public static final int h = -7;
    public static final int i = -8;
    public static final int j = -9;
    public static final int k = -10;
    public static final int l = -11;

    public static String a(int n2) {
        switch (n2) {
            case 0: {
                return "REQUEST_SUCCESS";
            }
            case -1: {
                return "REQUEST_FAILED";
            }
            case -3: {
                return "ILLEGAL_ARGUMENT";
            }
            case -4: {
                return "BLE_NOT_SUPPORTED";
            }
            case -5: {
                return "BLUETOOTH_DISABLED";
            }
            case -6: {
                return "SERVICE_UNREADY";
            }
            case -7: {
                return "REQUEST_TIMEDOUT";
            }
            case -9: {
                return "REQUEST_DENIED";
            }
        }
        return "unknown code: " + n2;
    }
}

