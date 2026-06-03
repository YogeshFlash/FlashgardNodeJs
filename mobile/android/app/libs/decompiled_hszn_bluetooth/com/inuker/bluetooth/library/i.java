/*
 * Decompiled with CFR 0.152.
 */
package com.inuker.bluetooth.library;

import java.util.UUID;

public class i {
    public static final String a = "extra.mac";
    public static final String b = "extra.service.uuid";
    public static final String c = "extra.character.uuid";
    public static final String d = "extra.descriptor.uuid";
    public static final String e = "extra.byte.value";
    public static final String f = "extra.code";
    public static final String g = "extra.status";
    public static final String h = "extra.state";
    public static final String i = "extra.rssi";
    public static final String j = "extra.version";
    public static final String k = "extra.request";
    public static final String l = "extra.search.result";
    public static final String m = "extra.gatt.profile";
    public static final String n = "extra.options";
    public static final String o = "extra.type";
    public static final String p = "extra.mtu";
    public static final int q = 0;
    public static final int r = -1;
    public static final int s = -2;
    public static final int t = -3;
    public static final int u = -4;
    public static final int v = -5;
    public static final int w = -6;
    public static final int x = -7;
    public static final int y = -8;
    public static final int z = -9;
    public static final int A = -10;
    public static final int B = 1;
    public static final int C = 2;
    public static final int D = 3;
    public static final int E = 4;
    public static final int F = 16;
    public static final int G = 32;
    public static final String H = "action.connect_status_changed";
    public static final String I = "action.character_changed";
    public static final int J = 1;
    public static final int K = 2;
    public static final UUID L = UUID.fromString("00002902-0000-1000-8000-00805f9b34fb");
    public static final int M = 1;
    public static final int N = 2;
    public static final int O = 3;
    public static final int P = 4;
    public static final int Q = 5;
    public static final int R = 6;
    public static final int S = 7;
    public static final int T = 8;
    public static final int U = 10;
    public static final int V = 11;
    public static final int W = 12;
    public static final int X = 13;
    public static final int Y = 14;
    public static final int Z = 20;
    public static final int aa = 21;
    public static final int ab = 22;
    public static final int ac = -1;
    public static final int ad = 2;
    public static final int ae = 1;
    public static final int af = 3;
    public static final int ag = 0;
    public static final int ah = 19;
    public static final int ai = 10;
    public static final int aj = 13;
    public static final int ak = 12;
    public static final int al = 11;
    public static final int am = 1;
    public static final int an = 2;
    public static final int ao = 4;
    public static final int ap = 8;
    public static final int aq = 10;
    public static final int ar = 11;
    public static final int as = 12;
    public static final int at = 23;
    public static final int au = 517;

    public static String a(int n2) {
        switch (n2) {
            case 2: {
                return "Connected";
            }
            case 1: {
                return "Connecting";
            }
            case 3: {
                return "Disconnecting";
            }
            case 0: {
                return "Disconnected";
            }
            case 19: {
                return "Service Ready";
            }
        }
        return String.format("Unknown %d", n2);
    }
}

