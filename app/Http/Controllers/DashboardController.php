<?php

namespace App\Http\Controllers;

use App\Models\Project;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class DashboardController extends Controller
{
    public function index()
    {
        $projects = Auth::user()->projects()->latest()->get();
        
        if (config('editing.react_editor')) return \Inertia\Inertia::render('Dashboard', ['projects'=>$projects->map(fn($p)=>['id'=>$p->id,'name'=>$p->name,'status'=>$p->status,'created_at'=>$p->created_at->toISOString()])]);
        return view('dashboard', compact('projects'));
    }
}